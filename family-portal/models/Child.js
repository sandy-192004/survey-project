const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO family_members (family_id, member_type, name, relationship, occupation, photo) VALUES (?, 'child', ?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, childData.relationship, childData.occupation, childData.photo];
  db.query(sql, values, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM family_members WHERE family_id = ? AND member_type = 'child'";

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT id AS child_id, name AS child_name, occupation, photo FROM family_members WHERE family_id = ? AND member_type = 'child'";
  db.query(sql, [parentId], callback);
};

exports.update = (childId, childData, callback) => {
  let sql = "UPDATE family_members SET name = ?, occupation = ? WHERE id = ?";
  let values = [childData.name, childData.occupation, childId];
  if (childData.photo !== undefined && childData.photo !== null) {
    sql = "UPDATE family_members SET name = ?, occupation = ?, photo = ? WHERE id = ?";
    values = [childData.name, childData.occupation, childData.photo, childId];
  }
  db.query(sql, values, callback);
};

exports.deleteById = (childId, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ?";
  db.query(sql, [childId], callback);
};

};