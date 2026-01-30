const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO children (parent_id, name, occupation, dob, gender, photo) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, childData.occupation, childData.dob, childData.gender, childData.photo];
  db.query(sql, values, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT * FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.update = (id, childData, callback) => {
  const sql = "UPDATE children SET name = ?, occupation = ?, dob = ?, gender = ?, photo = ? WHERE child_id = ?";
  const values = [childData.name, childData.occupation, childData.dob, childData.gender, childData.photo, id];
  db.query(sql, values, callback);
};

exports.delete = (id, callback) => {
  const sql = "DELETE FROM children WHERE child_id = ?";
  db.query(sql, [id], callback);
};
