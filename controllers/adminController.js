const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Admin = require("../models/admin");
const Child = require("../models/Child");

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
      districts: [...new Set(districts)]
    };
  } catch (error) {
    console.error("Error loading dropdown options:", error);
    return { states: [], districts: [] };
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
  await connection.query(
    `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
     VALUES (?, ?, ?, ?)`,
    [userId, personId, relatedPersonId, relation]
  );
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
        (SELECT COUNT(*) FROM relationships WHERE relation = 'child') AS totalChildren,
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
        p.name AS name,
        ${districtExpression} AS district,
        ${stateExpression} AS state,
        ${occupationExpression} AS occupation,
        (
          SELECT COUNT(*)
          FROM relationships r
          WHERE r.user_id = p.user_id AND r.person_id = p.id AND r.relation = 'child'
        ) AS children_count
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

    const [allRelations] = await db.query(
      `SELECT person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [userId]
    );

    // Resolve the actual family head from relationship graph instead of assuming MIN(person.id)
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

    let headPerson = persons[0];
    if (outgoingCount.size > 0) {
      const sortedCandidates = Array.from(outgoingCount.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0] - b[0];
        });
      const headCandidate = personById.get(sortedCandidates[0][0]);
      if (headCandidate) {
        headPerson = headCandidate;
      }
    }

    const headId = Number(headPerson.id);
    const relations = allRelations.filter(
      (rel) => Number(rel.person_id) === headId || Number(rel.related_person_id) === headId
    );

    const grouped = {
      father: null,
      mother: null,
      self: { ...headPerson, relationship: "Self" },
      spouse: null,
      siblings: [],
      children: []
    };

    relations.forEach((rel) => {
      const personId = Number(rel.person_id);
      const relatedPersonId = Number(rel.related_person_id);
      const isForward = personId === headId;
      const relatedId = isForward ? relatedPersonId : personId;
      const related = personById.get(relatedId);
      if (!related) {
        return;
      }

      const relation = String(rel.relation || "").trim().toLowerCase();

      if (relation === "father") {
        grouped.father = { ...related, relationship: "Father" };
      } else if (relation === "mother") {
        grouped.mother = { ...related, relationship: "Mother" };
      } else if (relation === "spouse") {
        grouped.spouse = { ...related, relationship: "Spouse" };
      } else if (relation === "child" || relation === "son" || relation === "daughter") {
        grouped.children.push({ ...related, relationship: "Child" });
      } else if (relation === "sibling" || relation === "brother" || relation === "sister") {
        grouped.siblings.push({
          ...related,
          relationship: relation === "brother" ? "Brother" : relation === "sister" ? "Sister" : "Sibling"
        });
      }
    });

    const uniqueById = (items) => {
      const seen = new Set();
      return items.filter((item) => {
        if (!item || seen.has(item.id)) {
          return false;
        }
        seen.add(item.id);
        return true;
      });
    };

    grouped.children = uniqueById(grouped.children);
    grouped.siblings = uniqueById(grouped.siblings);

    // Fallback: fetch direct child/sibling rows for head if previous mapping found none.
    if (grouped.children.length === 0 || grouped.siblings.length === 0) {
      const [directLinks] = await db.query(
        `SELECT person_id, related_person_id, relation
         FROM relationships
         WHERE user_id = ?
           AND person_id = ?
           AND relation IN ('child', 'son', 'daughter', 'sibling', 'brother', 'sister')`,
        [userId, headId]
      );

      directLinks.forEach((rel) => {
        const relation = String(rel.relation || "").trim().toLowerCase();
        const related = personById.get(Number(rel.related_person_id));
        if (!related) {
          return;
        }

        if (relation === "child" || relation === "son" || relation === "daughter") {
          grouped.children.push({ ...related, relationship: "Child" });
        }

        if (relation === "sibling" || relation === "brother" || relation === "sister") {
          grouped.siblings.push({
            ...related,
            relationship: relation === "brother" ? "Brother" : relation === "sister" ? "Sister" : "Sibling"
          });
        }
      });

      grouped.children = uniqueById(grouped.children);
      grouped.siblings = uniqueById(grouped.siblings);
    }

    // Secondary fallback: if still empty, derive from all relationships for this user.
    if (grouped.children.length === 0 || grouped.siblings.length === 0) {
      const relationToBucket = (value) => {
        const r = String(value || "").trim().toLowerCase();
        if (r === "child" || r === "son" || r === "daughter") return "child";
        if (r === "sibling" || r === "brother" || r === "sister") return "sibling";
        return null;
      };

      allRelations.forEach((rel) => {
        const bucket = relationToBucket(rel.relation);
        if (!bucket) {
          return;
        }

        const personId = Number(rel.person_id);
        const relatedId = Number(rel.related_person_id);

        const candidates = [personById.get(personId), personById.get(relatedId)].filter(Boolean);
        candidates.forEach((candidate) => {
          if (Number(candidate.id) === headId) {
            return;
          }

          if (bucket === "child") {
            grouped.children.push({ ...candidate, relationship: "Child" });
          }

          if (bucket === "sibling") {
            const relText = String(rel.relation || "").trim().toLowerCase();
            grouped.siblings.push({
              ...candidate,
              relationship: relText === "brother" ? "Brother" : relText === "sister" ? "Sister" : "Sibling"
            });
          }
        });
      });

      grouped.children = uniqueById(grouped.children);
      grouped.siblings = uniqueById(grouped.siblings);
    }

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
      family: {
        father: toPersonPayload(grouped.father, "Male"),
        mother: toPersonPayload(grouped.mother, "Female"),
        self: toPersonPayload(grouped.self),
        spouse: toPersonPayload(grouped.spouse),
        children: (grouped.children || []).map(child => ({
          id: child.id,
          name: child.name || "",
          gender: child.gender || "",
          dob: toInputDate(child.dob),
          image: child.image || ""
        })),
        siblings: (grouped.siblings || []).map(sibling => ({
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
      ? `parent/${fileNameFromAnyUpload(files, "my_image")}`
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
      defaultFolder: "parent",
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
       WHERE user_id = ? AND person_id = ? AND relation = 'sibling'`,
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
         AND relation IN ('father', 'mother', 'spouse', 'child', 'sibling')`,
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
      const isSister = relationRaw === "sister";
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
          siblingImageName ? `children/${siblingImageName}` : (previousSiblingImage || null),
          sharedAddress.door_no,
          sharedAddress.street,
          sharedAddress.district,
          sharedAddress.state,
          sharedAddress.pincode
        ]
      );

      await insertRelationship(connection, userId, selfId, Number(inserted.insertId), "sibling");
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
  try {
    const familyId = req.params.familyId;
    const file = req.files[0];
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const field = file.fieldname;
    const folder = field.includes("child") ? "children" : "parent";
    const photoPath = `${folder}/${file.filename}`;

    if (field === "husband_photo") {
      await db.query(
        "UPDATE family_members SET photo = ? WHERE family_id = ? AND relationship = 'husband'",
        [photoPath, familyId]
      );
    } else if (field === "wife_photo") {
      await db.query(
        "UPDATE family_members SET photo = ? WHERE family_id = ? AND relationship = 'wife'",
        [photoPath, familyId]
      );
    }

    res.json({ success: true, path: photoPath });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
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
          FROM relationships r
          WHERE r.user_id = p.user_id AND r.person_id = p.id AND r.relation = 'child'
        ) AS children_count
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
    const body = req.body || {};
    const myName = normalizeValue(body.my_name);
    const myGender = normalizeValue(body.my_gender);
    const myDob = normalizeValue(body.my_dob);
    const myMobile = normalizeValue(body.my_mobile);
    const myOccupation = normalizeValue(body.my_occupation);
    const fatherName = normalizeValue(body.father_name);
    const motherName = normalizeValue(body.mother_name);
    const spouseName = normalizeValue(body.spouse_name);
    const spouseGender = normalizeValue(body.spouse_gender);
    const spouseMobile = normalizeValue(body.spouse_mobile);
    const spouseOccupation = normalizeValue(body.spouse_occupation);
    const doorNo = normalizeValue(body.door_no);
    const street = normalizeValue(body.street);
    const district = normalizeValue(body.district);
    const state = normalizeValue(body.state);
    const pincode = normalizeValue(body.pincode);

    const children = parseCollection(body, "children");
    const siblings = parseCollection(body, "siblings");

    if (!myName) {
      return res.status(400).json({ success: false, message: "Main person name is required." });
    }

    if (!myMobile || !isValidMobile(myMobile)) {
      return res.status(400).json({ success: false, message: "Main mobile must be a 10-digit number." });
    }

    if (spouseMobile && !isValidMobile(spouseMobile)) {
      return res.status(400).json({ success: false, message: "Spouse mobile must be a 10-digit number." });
    }

    const parentMobiles = [body.father_mobile, body.mother_mobile].map(normalizeValue).filter(Boolean);
    if (parentMobiles.some(mobile => !isValidMobile(mobile))) {
      return res.status(400).json({ success: false, message: "Parent mobile numbers must be 10 digits." });
    }

    for (const child of children) {
      const childName = normalizeValue(child.name);
      const childMobile = normalizeValue(child.mobile);

      if ((childName || childMobile || child.dob || child.gender || child.occupation || child.image) && !childName) {
        return res.status(400).json({ success: false, message: "Each child entry needs a name." });
      }

      if (childMobile && !isValidMobile(childMobile)) {
        return res.status(400).json({ success: false, message: "Child mobile numbers must be 10 digits." });
      }
    }

    for (const sibling of siblings) {
      const siblingName = normalizeValue(sibling.name);
      const siblingMobile = normalizeValue(sibling.mobile);

      if ((siblingName || siblingMobile || sibling.gender || sibling.relation || sibling.image) && !siblingName) {
        return res.status(400).json({ success: false, message: "Each sibling entry needs a name." });
      }

      if (siblingMobile && !isValidMobile(siblingMobile)) {
        return res.status(400).json({ success: false, message: "Sibling mobile numbers must be 10 digits." });
      }
    }

    await connection.beginTransaction();

    const sharedAddress = {
      door_no: doorNo,
      street,
      district,
      state,
      pincode
    };

    const headPersonId = await insertPerson(connection, userId, {
      name: myName,
      gender: myGender,
      dob: myDob,
      mobile: myMobile,
      occupation: myOccupation,
      image: getUploadedFileName(files, "my_image") ? `parent/${getUploadedFileName(files, "my_image")}` : null,
      ...sharedAddress
    });

    const fatherNameValue = fatherName;
    if (fatherNameValue) {
      const fatherPersonId = await insertPerson(connection, userId, {
        name: fatherNameValue,
        gender: "Male",
        occupation: normalizeValue(body.father_occupation),
        image: getUploadedFileName(files, "father_image") ? `parent/${getUploadedFileName(files, "father_image")}` : null,
        ...sharedAddress
      });
      await insertRelationship(connection, userId, headPersonId, fatherPersonId, "father");
    }

    const motherNameValue = motherName;
    if (motherNameValue) {
      const motherPersonId = await insertPerson(connection, userId, {
        name: motherNameValue,
        gender: "Female",
        occupation: normalizeValue(body.mother_occupation),
        image: getUploadedFileName(files, "mother_image") ? `parent/${getUploadedFileName(files, "mother_image")}` : null,
        ...sharedAddress
      });
      await insertRelationship(connection, userId, headPersonId, motherPersonId, "mother");
    }

    if (spouseName) {
      const spousePersonId = await insertPerson(connection, userId, {
        name: spouseName,
        gender: spouseGender,
        mobile: spouseMobile,
        occupation: spouseOccupation,
        image: getUploadedFileName(files, "spouse_image") ? `parent/${getUploadedFileName(files, "spouse_image")}` : null,
        ...sharedAddress
      });
      await insertRelationship(connection, userId, headPersonId, spousePersonId, "spouse");
    }

    for (const child of children) {
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

    for (const sibling of siblings) {
      const siblingName = normalizeValue(sibling.name);
      if (!siblingName) {
        continue;
      }

      const siblingImageField = `siblings[${sibling.index}][image]`;
      const siblingPhotoField = `siblings[${sibling.index}][photo]`;

      const siblingRelation = normalizeValue(sibling.relation)?.toLowerCase() === "sister"
        ? "sister"
        : "brother";

      const siblingPersonId = await insertPerson(connection, userId, {
        name: siblingName,
        gender: normalizeValue(sibling.gender) || (siblingRelation === "sister" ? "Female" : "Male"),
        dob: normalizeValue(sibling.dob),
        mobile: normalizeValue(sibling.mobile),
        occupation: normalizeValue(sibling.occupation),
        image: getUploadedFileName(files, siblingImageField)
          ? `children/${getUploadedFileName(files, siblingImageField)}`
          : getUploadedFileName(files, siblingPhotoField)
            ? `children/${getUploadedFileName(files, siblingPhotoField)}`
            : null,
        ...sharedAddress
      });
      await insertRelationship(connection, userId, headPersonId, siblingPersonId, "sibling");
    }

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
// ADD CHILD
// =======================
exports.addChild = async (req, res) => {
  try {
    const FamilyMember = require("../models/FamilyMember");
    const { family_id, name, gender, dob, occupation, door_no, street, district, state, pincode } = req.body;

    if (!family_id || !name) {
      return res.status(400).send("Family ID and name are required");
    }

    const relationship = gender === 'Male' ? 'son' : gender === 'Female' ? 'daughter' : 'other';

    await FamilyMember.create({
      family_id: family_id,
      member_type: "child",
      name: name,
      relationship: relationship,
      gender: gender,
      dob: dob,
      occupation: occupation || "",
      door_no: door_no || "",
      street: street || "",
      district: district || "",
      state: state || "",
      pincode: pincode || "",
      photo: req.files?.find(f => f.fieldname === "photo") ? `children/${req.files.find(f => f.fieldname === "photo").filename}` : null
    });

    res.redirect(`/admin/edit/${family_id}?message=Child added successfully`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};





