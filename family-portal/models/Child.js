const db = require("../config/db");

exports.create = (childData, callback) => {
  const relationship = childData.gender === 'Male' ? 'son' : 'daughter';
  const sql = "INSERT INTO family_members (family_id, member_type, name, relationship, occupation, dob, gender, photo) VALUES (?, 'child', ?, ?, ?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, relationship, childData.occupation, childData.dob, childData.gender, childData.photo];
  db.query(sql, values, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM family_members WHERE family_id = ? AND member_type = 'child'";
  db.query(sql, [parentId], callback);
};

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT * FROM family_members WHERE family_id = ? AND member_type = 'child'";
  db.query(sql, [parentId], callback);
};

exports.update = (childId, childData, callback) => {
  const relationship = childData.gender === 'Male' ? 'son' : 'daughter';
  const sql = "UPDATE family_members SET name = ?, relationship = ?, occupation = ?, dob = ?, gender = ?, photo = ? WHERE id = ? AND member_type = 'child'";
  const values = [childData.name, relationship, childData.occupation, childData.dob, childData.gender, childData.photo, childId];
  db.query(sql, values, callback);
};

exports.deleteById = (childId, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ? AND member_type = 'child'";
  db.query(sql, [childId], callback);
};
