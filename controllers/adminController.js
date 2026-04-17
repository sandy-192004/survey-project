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
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");
    const members = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    const parent = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const formattedChildren = children.map(c => ({
      child_id: c.id,
      child_name: c.name,
      gender: c.gender,
      occupation: c.occupation,
      date_of_birth: c.dob,
      photo: c.photo,
      door_no: c.door_no || parent?.door_no || "",
      street: c.street || parent?.street || "",
      district: c.district || parent?.district || "",
      state: c.state || parent?.state || "",
      pincode: c.pincode || parent?.pincode || ""
    }));

    const { states, districts } = loadDropdownOptions();

    res.render("admin/edit", {
      familyId,
      parent: parent ? {
        id: parent.id,
        husband_name: parent.name,
        mobile: parent.mobile,
        occupation: parent.occupation,
        door_no: parent.door_no,
        street: parent.street,
        district: parent.district,
        state: parent.state,
        pincode: parent.pincode,
        husband_photo: parent.photo
      } : null,
      wife: wife ? {
        name: wife.name,
        mobile: wife.mobile,
        occupation: wife.occupation,
        door_no: wife.door_no,
        street: wife.street,
        district: wife.district,
        state: wife.state,
        pincode: wife.pincode,
        photo: wife.photo
      } : null,
      children: formattedChildren,
      states: states,
      districts: districts,
      message: req.query.message || null
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
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");
    const members = await FamilyMember.getByFamilyId(familyId);
    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const uploadedFiles = {};
    if (req.files) {
      req.files.forEach(file => {
        uploadedFiles[file.fieldname] = file.filename;
      });
    }

    // Update Husband
    if (husband) {
      const husbandData = {
        name: req.body.name || husband.name, // Use existing value if undefined/null
        mobile: req.body.mobile || "",
        occupation: req.body.occupation || "",
        door_no: req.body.door_no || "",
        street: req.body.street || "",
        district: req.body.district || "",
        state: req.body.state || "",
        pincode: req.body.pincode || "",
        photo: uploadedFiles.husband_photo ? `parent/${uploadedFiles.husband_photo}` : husband.photo
      };

      // Only update if name has a valid value
      if (husbandData.name) {
        if (uploadedFiles.husband_photo && husband.photo) {
          const oldPath = path.join(__dirname, '../uploads', husband.photo);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await FamilyMember.update(husband.id, husbandData);
      }
    }

    // Update Wife
    if (req.body.wife_name) {
      const wifeData = {
        family_id: familyId,
        member_type: "parent",
        name: req.body.wife_name,
        relationship: "wife",
        mobile: req.body.wife_mobile || "",
        occupation: req.body.wife_occupation || "",
        door_no: req.body.wife_door_no || "",
        street: req.body.wife_street || "",
        district: req.body.wife_district || "",
        state: req.body.wife_state || "",
        pincode: req.body.wife_pincode || "",
        photo: uploadedFiles.wife_photo ? `parent/${uploadedFiles.wife_photo}` : (wife ? wife.photo : null)
      };
      if (wife) await FamilyMember.update(wife.id, wifeData);
      else await FamilyMember.create(wifeData);
    }

    // Children Updates
    if (req.body.children) {
      const childKeys = Object.keys(req.body.children).sort();
      for (const key of childKeys) {
        const child = req.body.children[key];
        if (child.name) {
          const childPhotoKey = `children[${key}][photo]`;
          const childPhoto = uploadedFiles[childPhotoKey] || null;
          
          // Validate gender - only accept 'Male' or 'Female'
          const validGender = (child.gender === 'Male' || child.gender === 'Female') ? child.gender : null;

          if (child.id) {
            const childData = {
              name: child.name,
              occupation: child.occupation || "",
              dob: child.dob,
              gender: validGender,
              door_no: child.door_no || "",
              street: child.street || "",
              district: child.district || "",
              state: child.state || "",
              pincode: child.pincode || ""
            };
            if (childPhoto) childData.photo = `children/${childPhoto}`;
            await FamilyMember.update(child.id, childData);
          } else {
            const rel = validGender === 'Male' ? 'son' : validGender === 'Female' ? 'daughter' : 'other';
            await FamilyMember.create({
              family_id: familyId,
              member_type: "child",
              name: child.name,
              relationship: rel,
              occupation: child.occupation || "",
              dob: child.dob,
              gender: validGender,
              door_no: child.door_no || "",
              street: child.street || "",
              district: child.district || "",
              state: child.state || "",
              pincode: child.pincode || "",
              photo: childPhoto ? `children/${childPhoto}` : null
            });
          }
        }
      }
    }

    res.redirect("/admin/dashboard?updated=true");

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).send("Server Error");
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
  try {
    const familyId = req.params.id;
    await db.query("DELETE FROM family_members WHERE family_id = ?", [familyId]);
    res.redirect("/admin/dashboard?deleted=true");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
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





