const db = require("../config/db");

function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

function relationToMemberType(relation) {
  return ["child", "son", "daughter"].includes(normalizeRelation(relation)) ? "child" : "parent";
}

function reverseRelation(fromRelation, rootGender) {
  const relation = normalizeRelation(fromRelation);
  if (relation === "father" || relation === "mother") return "child";
  if (relation === "spouse") return "spouse";
  if (["child", "son", "daughter"].includes(relation)) {
    return normalizeRelation(rootGender) === "female" ? "mother" : "father";
  }
  return "sibling";
}

async function getRootByUserId(userId) {
  const [rows] = await db.query(
    "SELECT id, user_id, gender FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
    [userId]
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function getRootByPersonId(personId) {
  const [ownerRows] = await db.query("SELECT user_id FROM persons WHERE id = ? LIMIT 1", [personId]);
  if (!Array.isArray(ownerRows) || ownerRows.length === 0) return null;
  return getRootByUserId(ownerRows[0].user_id);
}

/**
 * Create a family member (parent or child)
 */
exports.create = async (data) => {
  const userId = Number(data.family_id);
  const root = await getRootByUserId(userId);
  if (!root) {
    throw new Error("Family root not found");
  }

  const [insertResult] = await db.query(
    `INSERT INTO persons
     (user_id, name, gender, dob, mobile, occupation, door_no, street, district, state, pincode, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      root.user_id,
      data.name || null,
      data.gender || null,
      data.dob || null,
      data.mobile || null,
      data.occupation || null,
      data.door_no || null,
      data.street || null,
      data.district || null,
      data.state || null,
      data.pincode || null,
      data.photo || null
    ]
  );

  const newPersonId = insertResult.insertId;
  const relation = normalizeRelation(data.relationship || data.member_type || "sibling");
  const reverse = reverseRelation(relation, root.gender);

  await db.query(
    `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
    [root.user_id, root.id, newPersonId, relation, root.user_id, newPersonId, root.id, reverse]
  );

  return newPersonId;
};

/**
 * Update a family member by ID
 */
exports.update = async (memberId, memberData) => {
  const parsedId = Number(memberId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new Error("Invalid member id");
  }

  const fields = {
    name: memberData.name,
    mobile: memberData.mobile,
    occupation: memberData.occupation,
    dob: memberData.dob,
    gender: memberData.gender,
    door_no: memberData.door_no,
    street: memberData.street,
    district: memberData.district,
    state: memberData.state,
    pincode: memberData.pincode,
    image: memberData.photo || memberData.image
  };

  await db.query("UPDATE persons SET ? WHERE id = ?", [fields, parsedId]);

  if (memberData.relationship) {
    const root = await getRootByPersonId(parsedId);
    if (root && Number(root.id) !== parsedId) {
      const relation = normalizeRelation(memberData.relationship);
      await db.query(
        "DELETE FROM relationships WHERE user_id = ? AND ((person_id = ? AND related_person_id = ?) OR (person_id = ? AND related_person_id = ?))",
        [root.user_id, root.id, parsedId, parsedId, root.id]
      );
      await db.query(
        `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
         VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
        [
          root.user_id,
          root.id,
          parsedId,
          relation,
          root.user_id,
          parsedId,
          root.id,
          reverseRelation(relation, root.gender)
        ]
      );
    }
  }
};

/**
 * Delete a family member by ID
 */
exports.deleteById = (memberId, callback) => {
  const parsedId = Number(memberId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return callback(new Error("Invalid member id"));
  }

  db.query("DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?", [parsedId, parsedId], (relErr) => {
    if (relErr) return callback(relErr);
    db.query("DELETE FROM persons WHERE id = ?", [parsedId], callback);
  });
};

/**
 * Get a single member by ID
 */
exports.getById = (memberId, callback) => {
  const parsedId = Number(memberId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return callback(null, []);
  }

  db.query("SELECT * FROM persons WHERE id = ? LIMIT 1", [parsedId], callback);
};

/**
 * Get ALL members of ONE family
 */
exports.getByFamilyId = async (familyId) => {
  const userId = Number(familyId);
  const root = await getRootByUserId(userId);
  if (!root) return [];

  const [rows] = await db.query(
    `SELECT
       p.*,
       COALESCE(r.relation, 'self') AS relationship,
       ? AS family_id,
       ? AS member_type,
       p.image AS photo
     FROM persons p
     LEFT JOIN relationships r
       ON r.user_id = p.user_id
       AND r.person_id = ?
       AND r.related_person_id = p.id
     WHERE p.user_id = ?
     ORDER BY p.id ASC`,
    [userId, "parent", root.id, userId]
  );

  return (rows || []).map((row) => ({
    ...row,
    member_type: row.relationship === "self" ? "parent" : relationToMemberType(row.relationship)
  }));
};

/**
 * Delete an entire family (all members)
 */
exports.deleteByFamilyId = (familyId, callback) => {
  const userId = Number(familyId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return callback(new Error("Invalid family id"));
  }

  db.query("DELETE FROM relationships WHERE user_id = ?", [userId], (relErr) => {
    if (relErr) return callback(relErr);
    db.query("DELETE FROM persons WHERE user_id = ?", [userId], callback);
  });
};

/**
 * Get ALL families (admin view)
 */
exports.getAll = (callback) => {
  const sql = `
    SELECT
      p.user_id AS family_id,
      p.id,
      p.name,
      p.gender,
      p.mobile,
      p.occupation,
      p.district,
      p.state,
      p.image AS photo
    FROM persons p
    ORDER BY p.user_id ASC, p.id ASC
  `;
  db.query(sql, callback);
};
