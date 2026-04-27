const db = require("../config/db");
const fs = require("fs");
const path = require("path");

function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

function totalPagesFromCount(count, limit) {
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  return Math.max(1, Math.ceil((Number(count) || 0) / safeLimit));
}

exports.getAll = (page, limit, callback) => {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const offset = (safePage - 1) * safeLimit;

  const sql = `
    SELECT
      root.user_id AS id,
      root.name AS name,
      spouse.name AS wife_name,
      root.mobile,
      root.occupation,
      root.door_no,
      root.street,
      root.district,
      root.state,
      root.pincode,
      root.image AS husband_photo,
      spouse.image AS wife_photo,
      (
        SELECT COUNT(*)
        FROM relationships rc
        WHERE rc.user_id = root.user_id
          AND rc.person_id = root.id
          AND LOWER(rc.relation) IN ('child', 'son', 'daughter')
      ) AS children_count
    FROM persons root
    LEFT JOIN relationships rs
      ON rs.user_id = root.user_id
      AND rs.person_id = root.id
      AND LOWER(rs.relation) = 'spouse'
    LEFT JOIN persons spouse ON spouse.id = rs.related_person_id
    WHERE root.id = (
      SELECT MIN(p2.id)
      FROM persons p2
      WHERE p2.user_id = root.user_id
    )
    ORDER BY root.name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = "SELECT COUNT(DISTINCT user_id) AS total FROM persons";

  db.query(countSql, (err, countResult) => {
    if (err) return callback(err);

    const total = Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0;
    const totalPages = totalPagesFromCount(total, safeLimit);

    db.query(sql, [safeLimit, offset], (err2, results) => {
      if (err2) return callback(err2);
      callback(null, { results: results || [], totalPages });
    });
  });
};

exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedState, selectedDistrict } = filters || {};
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const offset = (safePage - 1) * safeLimit;

  const params = [];
  let whereClause = `
    WHERE root.id = (
      SELECT MIN(p2.id)
      FROM persons p2
      WHERE p2.user_id = root.user_id
    )
  `;

  if (input) {
    whereClause += " AND (root.name LIKE ? OR root.mobile LIKE ? OR root.occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like);
  }

  if (selectedState) {
    whereClause += " AND root.state = ?";
    params.push(selectedState);
  }

  if (selectedDistrict) {
    whereClause += " AND root.district = ?";
    params.push(selectedDistrict);
  }

  const baseSql = `
    FROM persons root
    LEFT JOIN relationships rs
      ON rs.user_id = root.user_id
      AND rs.person_id = root.id
      AND LOWER(rs.relation) = 'spouse'
    LEFT JOIN persons spouse ON spouse.id = rs.related_person_id
    ${whereClause}
  `;

  const sql = `
    SELECT
      root.user_id AS id,
      root.name AS name,
      spouse.name AS wife_name,
      root.mobile,
      root.occupation,
      root.district,
      root.state,
      (
        SELECT COUNT(*)
        FROM relationships rc
        WHERE rc.user_id = root.user_id
          AND rc.person_id = root.id
          AND LOWER(rc.relation) IN ('child', 'son', 'daughter')
      ) AS children_count
    ${baseSql}
    ORDER BY root.name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total ${baseSql}`;

  db.query(countSql, params, (err, countResult) => {
    if (err) return callback(err);

    const total = Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0;
    const totalPages = totalPagesFromCount(total, safeLimit);

    const finalParams = [...params, safeLimit, offset];
    db.query(sql, finalParams, (err2, results) => {
      if (err2) return callback(err2);
      callback(null, { results: results || [], totalPages });
    });
  });
};

exports.getDropdownOptions = (callback) => {
  const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return callback(err);

    try {
      const json = JSON.parse(data);
      const states = Object.keys(json).sort();
      const districts = [...new Set(states.flatMap((state) => json[state]))].sort();
      callback(null, { states, districts });
    } catch (parseError) {
      callback(parseError);
    }
  });
};

exports.getMemberById = (id, callback) => {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return callback(null, null);
  }

  const sql = `
    SELECT
      root.user_id AS family_id,
      root.name AS husband_name,
      spouse.name AS wife_name,
      root.mobile,
      root.occupation,
      root.door_no,
      root.street,
      root.district,
      root.state,
      root.pincode,
      root.image AS husband_photo,
      spouse.image AS wife_photo
    FROM persons root
    LEFT JOIN relationships rs
      ON rs.user_id = root.user_id
      AND rs.person_id = root.id
      AND LOWER(rs.relation) = 'spouse'
    LEFT JOIN persons spouse ON spouse.id = rs.related_person_id
    WHERE root.user_id = ?
      AND root.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = root.user_id
      )
    LIMIT 1
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return callback(err);
    if (!Array.isArray(results) || results.length === 0) return callback(null, null);
    callback(null, results[0]);
  });
};

exports.updateMember = (id, data, callback) => {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return callback(new Error("Invalid family id"));
  }

  db.query(
    "SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
    [userId],
    (rootErr, rootRows) => {
      if (rootErr) return callback(rootErr);
      if (!Array.isArray(rootRows) || rootRows.length === 0) {
        return callback(new Error("Family not found"));
      }

      const rootId = rootRows[0].id;

      const rootSql = `
        UPDATE persons
        SET name = ?, mobile = ?, occupation = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?, image = ?
        WHERE id = ? AND user_id = ?
      `;
      const rootParams = [
        data.name,
        data.mobile || null,
        data.occupation || null,
        data.door_no || null,
        data.street || null,
        data.district || null,
        data.state || null,
        data.pincode || null,
        data.husband_photo || null,
        rootId,
        userId
      ];

      db.query(rootSql, rootParams, (rootUpdateErr) => {
        if (rootUpdateErr) return callback(rootUpdateErr);

        db.query(
          `SELECT p.id
           FROM relationships r
           JOIN persons p ON p.id = r.related_person_id
           WHERE r.user_id = ? AND r.person_id = ? AND LOWER(r.relation) = 'spouse'
           LIMIT 1`,
          [userId, rootId],
          (spouseErr, spouseRows) => {
            if (spouseErr) return callback(spouseErr);
            if (!Array.isArray(spouseRows) || spouseRows.length === 0) return callback(null);

            const spouseSql = "UPDATE persons SET name = ?, image = ? WHERE id = ? AND user_id = ?";
            const spouseParams = [data.wife_name || null, data.wife_photo || null, spouseRows[0].id, userId];
            db.query(spouseSql, spouseParams, callback);
          }
        );
      });
    }
  );
};

exports.getChildrenByParentId = (parentId, callback) => {
  const userId = Number(parentId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return callback(null, []);
  }

  const sql = `
    SELECT
      child.id AS child_id,
      child.name AS child_name,
      child.occupation,
      child.dob AS date_of_birth,
      child.gender,
      child.image AS photo
    FROM persons root
    JOIN relationships r
      ON r.user_id = root.user_id
      AND r.person_id = root.id
      AND LOWER(r.relation) IN ('child', 'son', 'daughter')
    JOIN persons child ON child.id = r.related_person_id
    WHERE root.user_id = ?
      AND root.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = root.user_id
      )
    ORDER BY child.id ASC
  `;

  db.query(sql, [userId], callback);
};

