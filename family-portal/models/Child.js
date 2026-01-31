const db = require("../config/db");

exports.create = (childData, callback) => {
  const relationship = childData.gender === 'Male' ? 'son' : 'daughter';
  const sql = "INSERT INTO family_members (family_id, member_type, name, relationship, occupation, photo, gender) VALUES (?, 'child', ?, ?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, relationship, childData.occupation, childData.photo, childData.gender];
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
  let sql = "UPDATE family_members SET name = ?, relationship = ?, occupation = ? WHERE id = ? AND member_type = 'child'";
  let values = [childData.name, relationship, childData.occupation, childId];
  if (childData.photo !== undefined && childData.photo !== null) {
    sql = "UPDATE family_members SET name = ?, relationship = ?, occupation = ?, photo = ? WHERE id = ? AND member_type = 'child'";
    values = [childData.name, relationship, childData.occupation, childData.photo, childId];
  }
  db.query(sql, values, callback);
};

exports.deleteById = (childId, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ? AND member_type = 'child'";
  db.query(sql, [childId], callback);
};

exports.update = (id, childData, callback) => {
  const relationship = childData.gender === 'Male' ? 'son' : 'daughter';
  const sql = "UPDATE family_members SET name = ?, relationship = ?, occupation = ?, dob = ?, gender = ?, photo = ? WHERE id = ? AND member_type = 'child'";
  const values = [childData.name, relationship, childData.occupation, childData.dob, childData.gender, childData.photo, id];
  db.query(sql, values, callback);
};

exports.delete = (id, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ? AND member_type = 'child'";
  db.query(sql, [id], callback);
};

