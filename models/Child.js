const db = require("../config/db");

function reverseParentRelation(gender) {
  return String(gender || "").toLowerCase() === "female" ? "mother" : "father";
}

exports.create = (childData, callback) => {
  const parentId = Number(childData.parent_id);
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return callback(new Error("Invalid parent id"));
  }

  db.query(
    "SELECT id, user_id, gender FROM persons WHERE id = ? LIMIT 1",
    [parentId],
    (parentErr, parentRows) => {
      if (parentErr) return callback(parentErr);
      if (!Array.isArray(parentRows) || parentRows.length === 0) {
        return callback(new Error("Parent not found"));
      }

      const parent = parentRows[0];
      const relation = String(childData.gender || "").toLowerCase() === "male" ? "son" : "daughter";

      db.query(
        `INSERT INTO persons (user_id, name, occupation, dob, gender, image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parent.user_id,
          childData.name || null,
          childData.occupation || null,
          childData.dob || null,
          childData.gender || null,
          childData.photo || null
        ],
        (insertErr, insertResult) => {
          if (insertErr) return callback(insertErr);

          const childId = insertResult.insertId;
          db.query(
            `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
             VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
            [
              parent.user_id,
              parentId,
              childId,
              relation,
              parent.user_id,
              childId,
              parentId,
              reverseParentRelation(parent.gender)
            ],
            (relationshipErr) => {
              if (relationshipErr) return callback(relationshipErr);
              callback(null, { insertId: childId });
            }
          );
        }
      );
    }
  );
};

exports.deleteByParent = (parentId, callback) => {
  const parsedParentId = Number(parentId);
  if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
    return callback(new Error("Invalid parent id"));
  }

  db.query(
    `SELECT related_person_id
     FROM relationships
     WHERE person_id = ? AND LOWER(relation) IN ('child', 'son', 'daughter')`,
    [parsedParentId],
    (selectErr, childRows) => {
      if (selectErr) return callback(selectErr);
      const childIds = (childRows || []).map((row) => Number(row.related_person_id)).filter((id) => Number.isInteger(id));

      db.query("DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?", [parsedParentId, parsedParentId], (deleteRelErr) => {
        if (deleteRelErr) return callback(deleteRelErr);

        if (childIds.length === 0) return callback(null);

        db.query("DELETE FROM persons WHERE id IN (?)", [childIds], callback);
      });
    }
  );
};

exports.getByParent = (parentId, callback) => {
  const parsedParentId = Number(parentId);
  if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
    return callback(null, []);
  }

  const sql = `
    SELECT p.*, r.relation
    FROM relationships r
    JOIN persons p ON p.id = r.related_person_id
    WHERE r.person_id = ?
      AND LOWER(r.relation) IN ('child', 'son', 'daughter')
    ORDER BY p.id ASC
  `;
  db.query(sql, [parsedParentId], callback);
};

exports.update = (childId, childData, callback) => {
  const parsedChildId = Number(childId);
  if (!Number.isInteger(parsedChildId) || parsedChildId <= 0) {
    return callback(new Error("Invalid child id"));
  }

  const sql = `
    UPDATE persons
    SET name = ?, occupation = ?, dob = ?, gender = ?, image = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      childData.name || null,
      childData.occupation || null,
      childData.dob || null,
      childData.gender || null,
      childData.photo || null,
      parsedChildId
    ],
    callback
  );
};

exports.deleteById = (childId, callback) => {
  const parsedChildId = Number(childId);
  if (!Number.isInteger(parsedChildId) || parsedChildId <= 0) {
    return callback(new Error("Invalid child id"));
  }

  db.query("DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?", [parsedChildId, parsedChildId], (relErr) => {
    if (relErr) return callback(relErr);
    db.query("DELETE FROM persons WHERE id = ?", [parsedChildId], callback);
  });
};
