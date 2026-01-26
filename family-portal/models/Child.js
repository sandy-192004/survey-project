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
