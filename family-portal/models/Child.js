const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO children (family_id, child_name, occupation, date_of_birth, gender, photo) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, childData.occupation, childData.dob, childData.gender, childData.photo];
  db.query(sql, values, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM children WHERE family_id = ?";
  db.query(sql, [parentId], callback);
};

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT child_id as id, family_id as parent_id, child_name as name, occupation, date_of_birth as dob, gender, photo FROM children WHERE family_id = ?";
  db.query(sql, [parentId], callback);
};
