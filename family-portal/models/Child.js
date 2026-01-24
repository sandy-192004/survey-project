const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO children SET ?";
  db.query(sql, childData, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT * FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};
