const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

function loadDropdownOptions() {
  try {
    const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);
    const states = Object.keys(jsonData);
    const districts = [];
    states.forEach(state => {
      districts.push(...jsonData[state]);
    });
    return {
      states,
      districts: [...new Set(districts)],
      stateDistrictMap: jsonData
    };
  } catch (error) {
    console.error("Error loading dropdown options:", error);
    return { states: [], districts: [], stateDistrictMap: {} };
  }
}

function normalizeValue(value) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isValidMobile(value) {
  if (!value) {
    return true;
  }

  return /^\d{10}$/.test(String(value).trim());
}

function getUploadedFileName(files, fieldName) {
  return files?.[fieldName]?.[0]?.filename || null;
}

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function safeUnlinkUpload(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    return;
  }

  const fullPath = path.join(__dirname, "../uploads", relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function fileNameFromAnyUpload(files, fieldName) {
  if (!Array.isArray(files)) {
    return null;
  }

  const matched = files.find(file => file.fieldname === fieldName);
  return matched ? matched.filename : null;
}

function findHeadPerson(persons, relationships) {
  if (!Array.isArray(persons) || persons.length === 0) {
    return null;
  }

  const relationKinds = new Set(["father", "mother", "spouse", "child", "brother", "sister", "sibling", "son", "daughter"]);
  const score = new Map();

  (relationships || []).forEach((rel) => {
    const kind = String(rel.relation || "").trim().toLowerCase();
    if (!relationKinds.has(kind)) {
      return;
    }

    const sourceId = Number(rel.person_id);
    const targetId = Number(rel.related_person_id);

    if (kind === "father" || kind === "mother") {
      score.set(sourceId, (score.get(sourceId) || 0) + 3);
      score.set(targetId, (score.get(targetId) || 0) + 1);
    } else {
      score.set(sourceId, (score.get(sourceId) || 0) + 2);
      score.set(targetId, (score.get(targetId) || 0) + 1);
    }
  });

  if (score.size === 0) {
    return persons[0];
  }

  const personById = new Map(persons.map(person => [Number(person.id), person]));
  const sorted = Array.from(score.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0] - right[0];
  });

  return personById.get(sorted[0][0]) || persons[0];
}

function groupAdminFamily(persons, relationships) {
  const personById = new Map((persons || []).map(person => [Number(person.id), person]));
  const self = findHeadPerson(persons || [], relationships || []);

  if (!self) {
    return {
      self: null,
      father: null,
      mother: null,
      spouse: null,
      children: [],
      siblings: []
    };
  }

  const selfId = Number(self.id);
  
  // CRITICAL: Only read FORWARD direction relationships (person_id = selfId)
  // This prevents duplicates from bidirectional relationships
  const relevantLinks = (relationships || []).filter(
    rel => Number(rel.person_id) === selfId
  );

  const grouped = {
    self,
    father: null,
    mother: null,
    spouse: null,
    children: [],
    siblings: []
  };

  const seenChildren = new Set();
  const seenSiblings = new Set();

  relevantLinks.forEach((rel) => {
    const relation = String(rel.relation || "").trim().toLowerCase();
    const relatedPersonId = Number(rel.related_person_id);
    const related = personById.get(relatedPersonId);

    if (!related || Number(related.id) === selfId) {
      return;
    }

    if (relation === "father") {
      grouped.father = related;
      return;
    }

    if (relation === "mother") {
      grouped.mother = related;
      return;
    }

    if (relation === "spouse") {
      grouped.spouse = related;
      return;
    }

    if (relation === "child" || relation === "son" || relation === "daughter") {
      if (!seenChildren.has(Number(related.id))) {
        grouped.children.push(related);
        seenChildren.add(Number(related.id));
      }
      return;
    }

    if (relation === "brother" || relation === "sister" || relation === "sibling") {
      if (!seenSiblings.has(Number(related.id))) {
        grouped.siblings.push({
          ...related,
          relation: relation === "sibling"
            ? (String(related.gender || "").toLowerCase() === "female" ? "sister" : "brother")
            : relation
        });
        seenSiblings.add(Number(related.id));
      }
    }
  });

  // Fallback: if parent links are missing, infer from remaining persons in the same user group.
  const takenIds = new Set([
    Number(grouped.self?.id),
    Number(grouped.spouse?.id),
    ...grouped.children.map(child => Number(child.id)),
    ...grouped.siblings.map(sibling => Number(sibling.id))
  ].filter(Number.isFinite));

  const candidates = (persons || []).filter(person => !takenIds.has(Number(person.id)));

  if (!grouped.father) {
    grouped.father = candidates.find((person) => String(person.gender || "").toLowerCase() === "male")
      || candidates[0]
      || null;
  }

  if (!grouped.mother) {
    const fatherId = Number(grouped.father?.id);
    grouped.mother = candidates.find((person) => Number(person.id) !== fatherId && String(person.gender || "").toLowerCase() === "female")
      || candidates.find((person) => Number(person.id) !== fatherId)
      || null;
  }

  return grouped;
}

function inferChildRelation(gender) {
  const normalizedGender = String(normalizeValue(gender) || "").toLowerCase();

  if (normalizedGender === "female" || normalizedGender === "f") {
    return "daughter";
  }

  if (normalizedGender === "male" || normalizedGender === "m") {
    return "son";
  }

  return "child";
}

function inferSiblingRelation(gender) {
  const normalizedGender = String(normalizeValue(gender) || "").toLowerCase();
  if (normalizedGender === "female" || normalizedGender === "f") {
    return "sister";
  }
  return "brother";
}

function buildUploadedImagePath(files, fieldName, folderName) {
  const fileName = getUploadedFileName(files, fieldName);
  return fileName ? `${folderName}/${fileName}` : null;
}

function parseCollection(body, collectionName) {
  const nestedCollection = body?.[collectionName];

  if (Array.isArray(nestedCollection)) {
    return nestedCollection
      .filter(entry => entry && typeof entry === "object")
      .map((entry, index) => ({ index, ...entry }));
  }

  if (nestedCollection && typeof nestedCollection === "object") {
    return Object.entries(nestedCollection)
      .filter(([, entry]) => entry && typeof entry === "object")
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([index, entry]) => ({ index: Number(index), ...entry }));
  }

  const grouped = new Map();
  const matcher = new RegExp(`^${collectionName}\\[(\\d+)\\]\\[(.+)\\]$`);

  Object.entries(body || {}).forEach(([key, value]) => {
    const match = key.match(matcher);
    if (!match) {
      return;
    }

    const index = Number(match[1]);
    const field = match[2];

    if (!grouped.has(index)) {
      grouped.set(index, {});
    }

    grouped.get(index)[field] = value;
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([index, entry]) => ({ index, ...entry }));
}

async function insertPerson(connection, userId, person) {
  const [result] = await connection.query(
    `INSERT INTO persons
     (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      person.name,
      person.gender || null,
      person.dob || null,
      person.mobile || null,
      person.occupation || null,
      person.image || null,
      person.door_no || null,
      person.street || null,
      person.district || null,
      person.state || null,
      person.pincode || null
    ]
  );

  return result.insertId;
}

async function insertRelationship(connection, userId, personId, relatedPersonId, relation) {
  const normalized = String(relation || "").trim().toLowerCase();
  const relationForDb = {
    husband: "spouse",
    wife: "spouse",
    son: "child",
    daughter: "child",
    brother: "sibling",
    sister: "sibling"
  }[normalized] || normalized;

  await connection.query(
    `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
     VALUES (?, ?, ?, ?)`,
    [userId, personId, relatedPersonId, relationForDb]
  );
}

function buildFamilyPayload(body) {
  const safeBody = body || {};

  return {
    myName: normalizeValue(safeBody.my_name),
    myGender: normalizeValue(safeBody.my_gender),
    myDob: normalizeValue(safeBody.my_dob),
    myMobile: normalizeValue(safeBody.my_mobile),
    myOccupation: normalizeValue(safeBody.my_occupation),
    fatherName: normalizeValue(safeBody.father_name),
    motherName: normalizeValue(safeBody.mother_name),
    spouseName: normalizeValue(safeBody.spouse_name),
    spouseGender: normalizeValue(safeBody.spouse_gender),
    spouseMobile: normalizeValue(safeBody.spouse_mobile),
    spouseOccupation: normalizeValue(safeBody.spouse_occupation),
    doorNo: normalizeValue(safeBody.door_no),
    street: normalizeValue(safeBody.street),
    district: normalizeValue(safeBody.district),
    state: normalizeValue(safeBody.state),
    pincode: normalizeValue(safeBody.pincode),
    children: parseCollection(safeBody, "children"),
    siblings: parseCollection(safeBody, "siblings"),
    rawBody: safeBody
  };
}

function validateFamilyPayload(payload) {
  if (!payload.myName) {
    return "Main person name is required.";
  }

  if (!payload.myMobile || !isValidMobile(payload.myMobile)) {
    return "Main mobile must be a 10-digit number.";
  }

  if (payload.spouseMobile && !isValidMobile(payload.spouseMobile)) {
    return "Spouse mobile must be a 10-digit number.";
  }

  const parentMobiles = [payload.rawBody.father_mobile, payload.rawBody.mother_mobile]
    .map(normalizeValue)
    .filter(Boolean);
  if (parentMobiles.some(mobile => !isValidMobile(mobile))) {
    return "Parent mobile numbers must be 10 digits.";
  }

  for (const child of payload.children) {
    const childName = normalizeValue(child.name);
    const childMobile = normalizeValue(child.mobile);

    if ((childName || childMobile || child.dob || child.gender || child.occupation || child.image) && !childName) {
      return "Each child entry needs a name.";
    }

    if (childMobile && !isValidMobile(childMobile)) {
      return "Child mobile numbers must be 10 digits.";
    }
  }

  for (const sibling of payload.siblings) {
    const siblingName = normalizeValue(sibling.name);
    const siblingMobile = normalizeValue(sibling.mobile);

    if ((siblingName || siblingMobile || sibling.gender || sibling.relation || sibling.image) && !siblingName) {
      return "Each sibling entry needs a name.";
    }

    if (siblingMobile && !isValidMobile(siblingMobile)) {
      return "Sibling mobile numbers must be 10 digits.";
    }
  }

  return null;
}

async function createFamilyRecords(connection, userId, files, payload) {
  const sharedAddress = {
    door_no: payload.doorNo,
    street: payload.street,
    district: payload.district,
    state: payload.state,
    pincode: payload.pincode
  };

  const headPersonId = await insertPerson(connection, userId, {
    name: payload.myName,
    gender: payload.myGender,
    dob: payload.myDob,
    mobile: payload.myMobile,
    occupation: payload.myOccupation,
    image: getUploadedFileName(files, "my_image") ? `main/${getUploadedFileName(files, "my_image")}` : null,
    ...sharedAddress
  });

  if (payload.fatherName) {
    const fatherPersonId = await insertPerson(connection, userId, {
      name: payload.fatherName,
      gender: "Male",
      occupation: normalizeValue(payload.rawBody.father_occupation),
      image: getUploadedFileName(files, "father_image") ? `parent/${getUploadedFileName(files, "father_image")}` : null,
      ...sharedAddress
    });
    await insertRelationship(connection, userId, headPersonId, fatherPersonId, "father");
  }

  if (payload.motherName) {
    const motherPersonId = await insertPerson(connection, userId, {
      name: payload.motherName,
      gender: "Female",
      occupation: normalizeValue(payload.rawBody.mother_occupation),
      image: getUploadedFileName(files, "mother_image") ? `parent/${getUploadedFileName(files, "mother_image")}` : null,
      ...sharedAddress
    });
    await insertRelationship(connection, userId, headPersonId, motherPersonId, "mother");
  }

  if (payload.spouseName) {
    const spousePersonId = await insertPerson(connection, userId, {
      name: payload.spouseName,
      gender: payload.spouseGender,
      mobile: payload.spouseMobile,
      occupation: payload.spouseOccupation,
      image: getUploadedFileName(files, "spouse_image") ? `main/${getUploadedFileName(files, "spouse_image")}` : null,
      ...sharedAddress
    });
    await insertRelationship(connection, userId, headPersonId, spousePersonId, "spouse");
  }

  for (const child of payload.children) {
    const childName = normalizeValue(child.name);
    if (!childName) {
      continue;
    }

    const childImageField = `children[${child.index}][image]`;
    const childPhotoField = `children[${child.index}][photo]`;

    const childPersonId = await insertPerson(connection, userId, {
      name: childName,
      gender: normalizeValue(child.gender),
      dob: normalizeValue(child.dob),
      mobile: normalizeValue(child.mobile),
      occupation: normalizeValue(child.occupation),
      image: getUploadedFileName(files, childImageField)
        ? `children/${getUploadedFileName(files, childImageField)}`
        : getUploadedFileName(files, childPhotoField)
          ? `children/${getUploadedFileName(files, childPhotoField)}`
          : null,
      ...sharedAddress
    });
    await insertRelationship(connection, userId, headPersonId, childPersonId, "child");
  }

  for (const sibling of payload.siblings) {
    const siblingName = normalizeValue(sibling.name);
    if (!siblingName) {
      continue;
    }

    const siblingImageField = `siblings[${sibling.index}][image]`;
    const siblingPhotoField = `siblings[${sibling.index}][photo]`;

    const siblingRelation = normalizeValue(sibling.relation)
      ? (normalizeValue(sibling.relation).toLowerCase() === "sister" ? "sister" : "brother")
      : inferSiblingRelation(sibling.gender);

    const siblingPersonId = await insertPerson(connection, userId, {
      name: siblingName,
      gender: normalizeValue(sibling.gender) || (siblingRelation === "sister" ? "Female" : "Male"),
      dob: normalizeValue(sibling.dob),
      mobile: normalizeValue(sibling.mobile),
      occupation: normalizeValue(sibling.occupation),
      image: getUploadedFileName(files, siblingImageField)
        ? `siblings/${getUploadedFileName(files, siblingImageField)}`
        : getUploadedFileName(files, siblingPhotoField)
          ? `siblings/${getUploadedFileName(files, siblingPhotoField)}`
          : null,
      ...sharedAddress
    });
    await insertRelationship(connection, userId, headPersonId, siblingPersonId, siblingRelation);
  }

  return headPersonId;
}

exports.showFamilyLogin = (req, res) => {
  res.render("admin/family-login", {
    error: req.query.error || null,
    registered: req.query.registered || null,
    flow: req.query.flow || null
  });
};

exports.familyLogin = async (req, res) => {
  try {
    const email = normalizeValue(req.body.email);
    const password = normalizeValue(req.body.password);

    if (!email || !password) {
      return res.redirect("/admin/family-login?error=invalid&flow=create-family");
    }

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.redirect("/admin/family-login?error=invalid&flow=create-family");
    }

    const user = rows[0];
    if (user.role !== "user") {
      return res.redirect("/admin/family-login?error=invalidRole&flow=create-family");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.redirect("/admin/family-login?error=invalid&flow=create-family");
    }

    req.session.user = { id: user.id, email: user.email, role: user.role };
    const redirectUrl = req.session.adminNextAfterAuth || "/admin/create-family";
    delete req.session.adminNextAfterAuth;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Admin-side family login error:", err);
    return res.redirect("/admin/family-login?error=server&flow=create-family");
  }
};

exports.familyRegister = async (req, res) => {
  try {
    const email = normalizeValue(req.body.email);
    const password = normalizeValue(req.body.password);
    const confirmPassword = normalizeValue(req.body.confirmPassword);

    if (!email || !password || !confirmPassword) {
      return res.redirect("/admin/family-login?error=invalid&flow=create-family");
    }

    if (password !== confirmPassword) {
      return res.redirect("/admin/family-login?error=password&flow=create-family");
    }

    if (password.length < 6) {
      return res.redirect("/admin/family-login?error=passwordLength&flow=create-family");
    }

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.redirect("/admin/family-login?error=exists&flow=create-family");
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, "user"]
    );

    req.session.user = { id: result.insertId, email, role: "user" };
    const redirectUrl = req.session.adminNextAfterAuth || "/admin/create-family";
    delete req.session.adminNextAfterAuth;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Admin-side family register error:", err);
    return res.redirect("/admin/family-login?error=server&flow=create-family");
  }
};

// =======================
// ADMIN DASHBOARD
// =======================
exports.dashboard = async (req, res) => {
  try {
    const q = req.query.q || "";
    const state = req.query.state || "";
    const district = req.query.district || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const offset = (page - 1) * limit;

    const { states, districts } = loadDropdownOptions();

    const [personColumns] = await db.query(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persons'
      `
    );
    const personColumnSet = new Set(personColumns.map(col => col.COLUMN_NAME));
    const hasPersonCreatedAt = personColumnSet.has("created_at");

    // Stats from persons/relationships schema
    const [statsResult] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM persons) AS totalFamilies,
        (SELECT COUNT(*) FROM persons) AS totalMembers,
        (SELECT COUNT(DISTINCT related_person_id) FROM relationships WHERE relation IN ('child', 'son', 'daughter')) AS totalChildren,
        (
          SELECT COUNT(DISTINCT user_id)
          FROM persons
          ${hasPersonCreatedAt ? "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)" : ""}
        ) AS recentFamilies
    `);

    const stats = {
      totalFamilies: statsResult[0].totalFamilies,
      totalMembers: statsResult[0].totalMembers,
      totalChildren: statsResult[0].totalChildren,
      recentFamilies: statsResult[0].recentFamilies
    };

    const hasMobile = personColumnSet.has("mobile");
    const hasOccupation = personColumnSet.has("occupation");
    const hasState = personColumnSet.has("state");
    const hasDistrict = personColumnSet.has("district");

    const districtExpression = hasDistrict ? "p.district" : "''";
    const stateExpression = hasState ? "p.state" : "''";
    const occupationExpression = hasOccupation ? "p.occupation" : "''";

    let sql = `
      SELECT
        p.user_id AS id,
        p.user_id AS user_id,
        p.name AS name,
        ${districtExpression} AS district,
        ${stateExpression} AS state,
        ${occupationExpression} AS occupation,
        (
          SELECT COUNT(*)
          FROM persons pm
          WHERE pm.user_id = p.user_id
        ) AS members_count
      FROM persons p
      WHERE p.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = p.user_id
      )
    `;
    const params = [];
    const countParams = [];
    const searchColumns = [];

    searchColumns.push("p.name");
    if (hasMobile) searchColumns.push("p.mobile");
    if (hasOccupation) searchColumns.push("p.occupation");

    if (q && searchColumns.length > 0) {
      const qCondition = searchColumns.map(col => `${col} LIKE ?`).join(" OR ");
      sql += ` AND (${qCondition})`;
      const like = `%${q}%`;
      for (let i = 0; i < searchColumns.length; i += 1) {
        params.push(like);
        countParams.push(like);
      }
    }

    if (state && hasState) {
      sql += " AND p.state = ?";
      params.push(state);
      countParams.push(state);
    }

    if (district && hasDistrict) {
      sql += " AND p.district = ?";
      params.push(district);
      countParams.push(district);
    }

    let countSql = `
      SELECT COUNT(DISTINCT p.user_id) AS total
      FROM persons p
      WHERE p.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = p.user_id
      )
    `;

    if (q && searchColumns.length > 0) {
      const qCondition = searchColumns.map(col => `${col} LIKE ?`).join(" OR ");
      countSql += ` AND (${qCondition})`;
    }
    if (state && hasState) countSql += " AND p.state = ?";
    if (district && hasDistrict) countSql += " AND p.district = ?";

    sql += " ORDER BY p.user_id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const totalPages = Math.ceil(countResult[0].total / limit);

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state,
      selectedDistrict: district,
      searchValue: q,
      totalPages,
      currentPage: page,
      updated: req.query.updated === "true",
      deleted: req.query.deleted === "true",
      stats,
      message: req.query.message || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// VIEW FAMILY MEMBERS
// =======================
exports.viewMember = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId)) {
      return res.status(400).send("Invalid family id");
    }

    // Step 1: Fetch all persons for this user
    const [persons] = await db.query(
      `SELECT id, user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    if (!persons || persons.length === 0) {
      return res.render("admin/view", {
        family: {
          father: null,
          mother: null,
          self: null,
          spouse: null,
          siblings: [],
          children: []
        }
      });
    }

    const personById = new Map(persons.map(person => [Number(person.id), person]));

    // Step 2: Fetch all relationships for this user
    const [allRelations] = await db.query(
      `SELECT person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [userId]
    );

    // Step 3: Find the family head (person with most outgoing relationships)
    const relationKinds = new Set(["father", "mother", "spouse", "child", "sibling", "brother", "sister", "son", "daughter"]);
    const outgoingCount = new Map();

    allRelations.forEach((rel) => {
      const kind = String(rel.relation || "").trim().toLowerCase();
      if (!relationKinds.has(kind)) {
        return;
      }
      const sourceId = Number(rel.person_id);
      outgoingCount.set(sourceId, (outgoingCount.get(sourceId) || 0) + 1);
    });

    let selfPerson = persons[0];
    if (outgoingCount.size > 0) {
      const sortedCandidates = Array.from(outgoingCount.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0] - b[0];
        });
      const headCandidate = personById.get(sortedCandidates[0][0]);
      if (headCandidate) {
        selfPerson = headCandidate;
      }
    }

    const selfId = Number(selfPerson.id);

    // Step 4: Fetch ONLY forward-direction relationships (person_id = selfId)
    // This prevents reading reverse relationships that would cause duplicates
    const [relatives] = await db.query(
      `SELECT r.relation, p.*
       FROM relationships r
       JOIN persons p ON p.id = r.related_person_id
       WHERE r.user_id = ? AND r.person_id = ?`,
      [userId, selfId]
    );

    // Step 5: Filter only valid relations and remove invalid/reversed ones
    const validRelations = ["father", "mother", "spouse", "child", "son", "daughter", "sibling", "brother", "sister"];
    const cleanMembers = relatives.filter(m =>
      validRelations.includes(String(m.relation || "").trim().toLowerCase())
    );

    // Step 6: Remove duplicates with priority (prevent parent becoming child)
    const uniqueMap = new Map();
    for (const member of cleanMembers) {
      const memberId = Number(member.id);
      if (!uniqueMap.has(memberId)) {
        uniqueMap.set(memberId, member);
      } else {
        const existing = uniqueMap.get(memberId);
        const existingRel = String(existing.relation || "").trim().toLowerCase();
        const currentRel = String(member.relation || "").trim().toLowerCase();

        // If existing is child but new one is a parent type, replace it
        if (existingRel === "child" && (currentRel === "father" || currentRel === "mother" || currentRel === "spouse")) {
          uniqueMap.set(memberId, member);
        }
      }
    }

    const uniqueMembers = Array.from(uniqueMap.values());

    // Step 7: Group members strictly by relation type
    const grouped = {
      father: null,
      mother: null,
      self: selfPerson,
      spouse: null,
      siblings: [],
      children: []
    };

    uniqueMembers.forEach((member) => {
      const relation = String(member.relation || "").trim().toLowerCase();

      if (relation === "father") {
        grouped.father = member;
      } else if (relation === "mother") {
        grouped.mother = member;
      } else if (relation === "spouse") {
        grouped.spouse = member;
      } else if (relation === "child" || relation === "son" || relation === "daughter") {
        grouped.children.push(member);
      } else if (relation === "sibling" || relation === "brother" || relation === "sister") {
        grouped.siblings.push(member);
      }
    });

    res.render("admin/view", { family: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// EDIT FAMILY
// =======================
exports.editMember = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId)) {
      return res.status(400).send("Invalid user id");
    }

    const [persons] = await db.query(
      `SELECT id, user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    const [relationships] = await db.query(
      `SELECT id, person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [userId]
    );

    const grouped = groupAdminFamily(persons, relationships);

    if (!grouped.self) {
      return res.status(404).send("Family not found");
    }

    // Deduplicate children and siblings
    const deduplicateArray = (items) => {
      const seen = new Set();
      return items.filter((item) => {
        if (seen.has(Number(item.id))) {
          return false;
        }
        seen.add(Number(item.id));
        return true;
      });
    };

    grouped.children = deduplicateArray(grouped.children || []);
    grouped.siblings = deduplicateArray(grouped.siblings || []);

    const { states, districts, stateDistrictMap } = loadDropdownOptions();

    const toPersonPayload = (person, fallbackGender = "") => ({
      id: person?.id || null,
      name: person?.name || "",
      gender: person?.gender || fallbackGender,
      dob: toInputDate(person?.dob),
      mobile: person?.mobile || "",
      occupation: person?.occupation || "",
      image: person?.image || "",
      door_no: person?.door_no || "",
      street: person?.street || "",
      district: person?.district || "",
      state: person?.state || "",
      pincode: person?.pincode || ""
    });

    res.render("admin/edit", {
      userId,
      states,
      districts,
      stateDistrictMap,
      family: {
        father: toPersonPayload(grouped.father, "Male"),
        mother: toPersonPayload(grouped.mother, "Female"),
        self: toPersonPayload(grouped.self),
        spouse: toPersonPayload(grouped.spouse),
        children: grouped.children.map(child => ({
          id: child.id,
          name: child.name || "",
          gender: child.gender || "",
          dob: toInputDate(child.dob),
          image: child.image || ""
        })),
        siblings: grouped.siblings.map(sibling => ({
          id: sibling.id,
          name: sibling.name || "",
          gender: sibling.gender || "",
          relation: sibling.relation || (String(sibling.gender || "").toLowerCase() === "female" ? "sister" : "brother"),
          image: sibling.image || ""
        }))
      },
      message: req.query.message || null,
      error: req.query.error || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// UPDATE FAMILY (INCLUDING PHOTOS)
// =======================
exports.updateMember = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).send("Invalid user id");
    }

    const body = req.body || {};
    const files = req.files || [];
    const children = parseCollection(body, "children");
    const siblings = parseCollection(body, "siblings");

    const myName = normalizeValue(body.my_name);
    const myMobile = normalizeValue(body.my_mobile);
    if (!myName) {
      return res.redirect(`/admin/edit/${userId}?error=${encodeURIComponent("Name is required")}`);
    }
    if (!myMobile || !isValidMobile(myMobile)) {
      return res.redirect(`/admin/edit/${userId}?error=${encodeURIComponent("Mobile must be 10 digits")}`);
    }

    const spouseMobile = normalizeValue(body.spouse_mobile);
    if (spouseMobile && !isValidMobile(spouseMobile)) {
      return res.redirect(`/admin/edit/${userId}?error=${encodeURIComponent("Spouse mobile must be 10 digits")}`);
    }

    await connection.beginTransaction();

    const [persons] = await connection.query(
      `SELECT id, user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    const [relationships] = await connection.query(
      `SELECT id, person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [userId]
    );

    const grouped = groupAdminFamily(persons, relationships);
    if (!grouped.self) {
      await connection.rollback();
      return res.redirect(`/admin/dashboard?message=${encodeURIComponent("Family not found")}`);
    }

    const selfId = Number(grouped.self.id);
    const sharedAddress = {
      door_no: normalizeValue(body.door_no),
      street: normalizeValue(body.street),
      district: normalizeValue(body.district),
      state: normalizeValue(body.state),
      pincode: normalizeValue(body.pincode)
    };

    const nextMyImage = fileNameFromAnyUpload(files, "my_image")
      ? `main/${fileNameFromAnyUpload(files, "my_image")}`
      : grouped.self.image;
    if (fileNameFromAnyUpload(files, "my_image") && grouped.self.image) {
      safeUnlinkUpload(grouped.self.image);
    }

    await connection.query(
      `UPDATE persons
       SET name = ?, gender = ?, dob = ?, mobile = ?, occupation = ?, image = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?
       WHERE id = ? AND user_id = ?`,
      [
        myName,
        normalizeValue(body.my_gender),
        normalizeValue(body.my_dob),
        myMobile,
        normalizeValue(body.my_occupation),
        nextMyImage || null,
        sharedAddress.door_no,
        sharedAddress.street,
        sharedAddress.district,
        sharedAddress.state,
        sharedAddress.pincode,
        selfId,
        userId
      ]
    );

    const upsertRelatedPerson = async ({ existingPerson, name, gender, mobile, occupation, dob, imageField, defaultFolder, allowCreate }) => {
      const normalizedName = normalizeValue(name);
      const uploadedName = fileNameFromAnyUpload(files, imageField);
      const nextImage = uploadedName ? `${defaultFolder}/${uploadedName}` : (existingPerson?.image || null);

      if (!normalizedName && !existingPerson) {
        return null;
      }

      if (existingPerson) {
        if (uploadedName && existingPerson.image) {
          safeUnlinkUpload(existingPerson.image);
        }

        const nextName = normalizedName || existingPerson.name;
        await connection.query(
          `UPDATE persons
           SET name = ?, gender = ?, dob = ?, mobile = ?, occupation = ?, image = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?
           WHERE id = ? AND user_id = ?`,
          [
            nextName,
            normalizeValue(gender) || existingPerson.gender || null,
            normalizeValue(dob) || existingPerson.dob || null,
            normalizeValue(mobile) || existingPerson.mobile || null,
            normalizeValue(occupation) || existingPerson.occupation || null,
            nextImage,
            sharedAddress.door_no,
            sharedAddress.street,
            sharedAddress.district,
            sharedAddress.state,
            sharedAddress.pincode,
            existingPerson.id,
            userId
          ]
        );
        return Number(existingPerson.id);
      }

      if (!allowCreate || !normalizedName) {
        return null;
      }

      const [inserted] = await connection.query(
        `INSERT INTO persons
         (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          normalizedName,
          normalizeValue(gender),
          normalizeValue(dob),
          normalizeValue(mobile),
          normalizeValue(occupation),
          nextImage,
          sharedAddress.door_no,
          sharedAddress.street,
          sharedAddress.district,
          sharedAddress.state,
          sharedAddress.pincode
        ]
      );

      return Number(inserted.insertId);
    };

    const fatherId = await upsertRelatedPerson({
      existingPerson: grouped.father,
      name: body.father_name,
      gender: "Male",
      mobile: body.father_mobile,
      occupation: body.father_occupation,
      dob: body.father_dob,
      imageField: "father_image",
      defaultFolder: "parent",
      allowCreate: true
    });

    const motherId = await upsertRelatedPerson({
      existingPerson: grouped.mother,
      name: body.mother_name,
      gender: "Female",
      mobile: body.mother_mobile,
      occupation: body.mother_occupation,
      dob: body.mother_dob,
      imageField: "mother_image",
      defaultFolder: "parent",
      allowCreate: true
    });

    const spouseId = await upsertRelatedPerson({
      existingPerson: grouped.spouse,
      name: body.spouse_name,
      gender: body.spouse_gender,
      mobile: body.spouse_mobile,
      occupation: body.spouse_occupation,
      dob: body.spouse_dob,
      imageField: "spouse_image",
      defaultFolder: "main",
      allowCreate: true
    });

    const [oldChildrenLinks] = await connection.query(
      `SELECT related_person_id
       FROM relationships
       WHERE user_id = ? AND person_id = ? AND relation IN ('child', 'son', 'daughter')`,
      [userId, selfId]
    );
    const [oldSiblingLinks] = await connection.query(
      `SELECT related_person_id
       FROM relationships
       WHERE user_id = ? AND person_id = ? AND relation IN ('sibling', 'brother', 'sister')`,
      [userId, selfId]
    );

    const oldChildrenIds = oldChildrenLinks.map(row => Number(row.related_person_id)).filter(Number.isFinite);
    const oldSiblingIds = oldSiblingLinks.map(row => Number(row.related_person_id)).filter(Number.isFinite);
    const allOldDependentIds = [...new Set([...oldChildrenIds, ...oldSiblingIds])];

    const oldImageByPersonId = new Map();
    if (allOldDependentIds.length > 0) {
      const [oldDependents] = await connection.query(
        `SELECT id, image FROM persons WHERE user_id = ? AND id IN (?)`,
        [userId, allOldDependentIds]
      );

      oldDependents.forEach((person) => {
        oldImageByPersonId.set(Number(person.id), person.image || null);
      });
    }

    const preserveImageIds = new Set();
    children.forEach((child) => {
      const existingId = Number(child.id);
      const hasUpload = Boolean(
        fileNameFromAnyUpload(files, `children[${child.index}][image]`)
        || fileNameFromAnyUpload(files, `children[${child.index}][photo]`)
      );

      if (Number.isFinite(existingId) && existingId > 0 && !hasUpload) {
        preserveImageIds.add(existingId);
      }
    });

    siblings.forEach((sibling) => {
      const existingId = Number(sibling.id);
      const hasUpload = Boolean(
        fileNameFromAnyUpload(files, `siblings[${sibling.index}][image]`)
        || fileNameFromAnyUpload(files, `siblings[${sibling.index}][photo]`)
      );

      if (Number.isFinite(existingId) && existingId > 0 && !hasUpload) {
        preserveImageIds.add(existingId);
      }
    });

    await connection.query(
      `DELETE FROM relationships
       WHERE user_id = ?
         AND person_id = ?
         AND relation IN ('father', 'mother', 'spouse', 'child', 'son', 'daughter', 'sibling', 'brother', 'sister')`,
      [userId, selfId]
    );

    if (fatherId) {
      await insertRelationship(connection, userId, selfId, fatherId, "father");
    }
    if (motherId) {
      await insertRelationship(connection, userId, selfId, motherId, "mother");
    }
    if (spouseId) {
      await insertRelationship(connection, userId, selfId, spouseId, "spouse");
    }

    const purgeRelatedPeople = async (ids, skipImageDeleteIds = new Set()) => {
      if (!ids || ids.length === 0) {
        return;
      }

      const [oldPersons] = await connection.query(
        `SELECT id, image FROM persons WHERE user_id = ? AND id IN (?)`,
        [userId, ids]
      );

      oldPersons.forEach((person) => {
        if (person.image && !skipImageDeleteIds.has(Number(person.id))) {
          safeUnlinkUpload(person.image);
        }
      });

      await connection.query(
        `DELETE FROM relationships
         WHERE user_id = ? AND (person_id IN (?) OR related_person_id IN (?))`,
        [userId, ids, ids]
      );

      await connection.query(
        `DELETE FROM persons WHERE user_id = ? AND id IN (?)`,
        [userId, ids]
      );
    };

    await purgeRelatedPeople(oldChildrenIds, preserveImageIds);
    await purgeRelatedPeople(oldSiblingIds, preserveImageIds);

    for (const child of children) {
      const childName = normalizeValue(child.name);
      if (!childName) {
        continue;
      }

      const childGender = normalizeValue(child.gender);
      const childImageName = fileNameFromAnyUpload(files, `children[${child.index}][image]`)
        || fileNameFromAnyUpload(files, `children[${child.index}][photo]`);
      const existingChildId = Number(child.id);
      const previousChildImage = Number.isFinite(existingChildId) ? oldImageByPersonId.get(existingChildId) : null;

      const [inserted] = await connection.query(
        `INSERT INTO persons
         (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          childName,
          childGender,
          normalizeValue(child.dob),
          normalizeValue(child.mobile),
          normalizeValue(child.occupation),
          childImageName ? `children/${childImageName}` : (previousChildImage || null),
          sharedAddress.door_no,
          sharedAddress.street,
          sharedAddress.district,
          sharedAddress.state,
          sharedAddress.pincode
        ]
      );

      await insertRelationship(connection, userId, selfId, Number(inserted.insertId), "child");
    }

    for (const sibling of siblings) {
      const siblingName = normalizeValue(sibling.name);
      if (!siblingName) {
        continue;
      }

      const relationRaw = String(normalizeValue(sibling.relation) || "").toLowerCase();
      const siblingRelation = relationRaw === "sister" || relationRaw === "brother"
        ? relationRaw
        : inferSiblingRelation(sibling.gender);
      const isSister = siblingRelation === "sister";
      const siblingGender = normalizeValue(sibling.gender) || (isSister ? "Female" : "Male");

      const siblingImageName = fileNameFromAnyUpload(files, `siblings[${sibling.index}][image]`)
        || fileNameFromAnyUpload(files, `siblings[${sibling.index}][photo]`);
      const existingSiblingId = Number(sibling.id);
      const previousSiblingImage = Number.isFinite(existingSiblingId) ? oldImageByPersonId.get(existingSiblingId) : null;

      const [inserted] = await connection.query(
        `INSERT INTO persons
         (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          siblingName,
          siblingGender,
          normalizeValue(sibling.dob),
          normalizeValue(sibling.mobile),
          normalizeValue(sibling.occupation),
          siblingImageName ? `siblings/${siblingImageName}` : (previousSiblingImage || null),
          sharedAddress.door_no,
          sharedAddress.street,
          sharedAddress.district,
          sharedAddress.state,
          sharedAddress.pincode
        ]
      );

      await insertRelationship(connection, userId, selfId, Number(inserted.insertId), siblingRelation);
    }

    await connection.commit();
    return res.redirect("/admin/dashboard?updated=true&message=Family%20updated%20successfully");

  } catch (err) {
    await connection.rollback();
    console.error("Update Error:", err);
    res.status(500).send("Server Error");
  } finally {
    connection.release();
  }
};

// =======================
// AJAX PHOTO UPLOAD (LIVE UPDATE)
// =======================
exports.uploadPhoto = async (req, res) => {
  let connection;

  try {
    const familyId = Number(req.params.familyId);
    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid family id" });
    }

    const files = req.files || [];
    const file = Array.isArray(files) ? files[0] : null;
    if (!file || !file.filename) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const field = String(file.fieldname || "");
    const photoPathMap = {
      my_image: "main",
      father_image: "parent",
      mother_image: "parent",
      spouse_image: "main",
      husband_photo: "parent",
      wife_photo: "parent"
    };
    const folderName = photoPathMap[field];

    if (!folderName) {
      return res.status(400).json({ success: false, message: "Unsupported upload field" });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [persons] = await connection.query(
      `SELECT id, user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [familyId]
    );

    const [relationships] = await connection.query(
      `SELECT id, person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [familyId]
    );

    const family = groupAdminFamily(persons, relationships);
    const targetByField = {
      my_image: family.self,
      father_image: family.father,
      mother_image: family.mother,
      spouse_image: family.spouse,
      husband_photo: family.self,
      wife_photo: family.spouse
    };

    const targetPerson = targetByField[field];
    if (!targetPerson) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Person not found for uploaded field" });
    }

    const previousImage = targetPerson.image || null;
    const photoPath = `${folderName}/${file.filename}`;

    await connection.query(
      `UPDATE persons
       SET image = ?
       WHERE id = ? AND user_id = ?`,
      [photoPath, Number(targetPerson.id), familyId]
    );

    await connection.commit();

    if (previousImage && previousImage !== photoPath) {
      safeUnlinkUpload(previousImage);
    }

    return res.json({ success: true, path: photoPath });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// =======================
// LOGOUT
// =======================
exports.logout = async (req, res) => {
  try {
    req.session.destroy(() => res.redirect("/login"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// DELETE FAMILY
// =======================
exports.deleteFamily = async (req, res) => {
  let connection;
  try {
    const familyId = Number(req.params.id);
    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.redirect("/admin/dashboard?message=Invalid family id");
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM relationships WHERE user_id = ?`,
      [familyId]
    );

    await connection.query(
      `DELETE FROM persons WHERE user_id = ?`,
      [familyId]
    );

    await connection.commit();
    res.redirect("/admin/dashboard?deleted=true");
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error(err);
    res.status(500).send("Server Error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// =======================
// SEARCH (ADMIN)
// =======================
exports.search = async (req, res) => {
  try {
    const { q, state, district } = req.query;
    const { states, districts } = loadDropdownOptions();

    let sql = `
      SELECT
        p.user_id AS id,
        p.name,
        p.district,
        p.state,
        p.occupation,
        (
          SELECT COUNT(*)
          FROM persons pm
          WHERE pm.user_id = p.user_id
        ) AS members_count
      FROM persons p
      WHERE p.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = p.user_id
      )
    `;
    const params = [];

    if (q) {
      sql += " AND (p.name LIKE ? OR p.mobile LIKE ? OR p.occupation LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (state) {
      sql += " AND p.state = ?";
      params.push(state);
    }
    if (district) {
      sql += " AND p.district = ?";
      params.push(district);
    }

    sql += " ORDER BY p.user_id DESC";

    const [rows] = await db.query(sql, params);

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state || "",
      selectedDistrict: district || "",
      searchValue: q || "",
      totalPages: 1,
      currentPage: 1,
      stats: {},
      message: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// CREATE FAMILY (ADMIN)
// =======================
exports.createFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!req.session.user || req.session.user.role !== "user") {
      return res.status(401).json({
        success: false,
        message: "Please login with a user account to continue."
      });
    }

    const userId = req.session.user.id;
    const files = req.files || {};
    const payload = buildFamilyPayload(req.body);
    const validationError = validateFamilyPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    await connection.beginTransaction();
    const headPersonId = await createFamilyRecords(connection, userId, files, payload);

    await connection.commit();

    return res.json({
      success: true,
      message: "Family created successfully.",
      userId,
      headPersonId,
      redirectUrl: "/admin/dashboard?message=Family created successfully"
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  } finally {
    connection.release();
  }
};

// =======================
// CREATE FAMILY WITH USER (Admin Direct Flow)
// =======================
exports.createFamilyWithUser = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const email = normalizeValue(req.body.email);
    const password = normalizeValue(req.body.password);
    const files = req.files || {};
    const payload = buildFamilyPayload(req.body);

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    await connection.beginTransaction();

    // Check if email already exists
    const [existingUser] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Email already exists. Please use a different email address."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [userResult] = await connection.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hashedPassword, "user"]
    );

    const userId = userResult.insertId;
    const validationError = validateFamilyPayload(payload);
    if (validationError) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const headPersonId = await createFamilyRecords(connection, userId, files, payload);

    // Commit transaction
    await connection.commit();

    // Return success response
    return res.json({
      success: true,
      message: "Family and user created successfully.",
      userId,
      headPersonId,
      redirectUrl: "/admin/dashboard?message=Family and user created successfully"
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  } finally {
    connection.release();
  }
};

// =======================
// ADD CHILD
// =======================
exports.addChild = async (req, res) => {
  let connection;

  try {
    const familyId = Number(req.body?.family_id);
    const name = normalizeValue(req.body?.name);
    const gender = normalizeValue(req.body?.gender);
    const dob = normalizeValue(req.body?.dob);
    const occupation = normalizeValue(req.body?.occupation);
    const doorNo = normalizeValue(req.body?.door_no);
    const street = normalizeValue(req.body?.street);
    const district = normalizeValue(req.body?.district);
    const state = normalizeValue(req.body?.state);
    const pincode = normalizeValue(req.body?.pincode);

    if (!Number.isInteger(familyId) || familyId <= 0 || !name) {
      return res.status(400).send("Family ID and name are required");
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [persons] = await connection.query(
      `SELECT id, user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [familyId]
    );

    if (!Array.isArray(persons) || persons.length === 0) {
      await connection.rollback();
      return res.status(404).send("Family not found");
    }

    const [relationships] = await connection.query(
      `SELECT id, person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [familyId]
    );

    const family = groupAdminFamily(persons, relationships);
    if (!family.self) {
      await connection.rollback();
      return res.status(404).send("Family not found");
    }

    const relationship = inferChildRelation(gender);
    const photoPath = buildUploadedImagePath(req.files || {}, "photo", "children");

    const [result] = await connection.query(
      `INSERT INTO persons
       (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        familyId,
        name,
        gender,
        dob,
        null,
        occupation,
        photoPath,
        doorNo,
        street,
        district,
        state,
        pincode
      ]
    );

    await connection.query(
      `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
       VALUES (?, ?, ?, ?)` ,
      [familyId, Number(family.self.id), Number(result.insertId), relationship]
    );

    await connection.commit();

    return res.redirect(`/admin/edit/${familyId}?message=Child added successfully`);
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error(err);
    res.status(500).send("Server Error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
};