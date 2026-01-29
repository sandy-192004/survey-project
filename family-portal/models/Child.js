const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO children SET ?";
  db.query(sql, childData, callback);
};

exports.update = (childId, childData, callback) => {
  const sql = "UPDATE children SET ? WHERE id = ?";
  db.query(sql, [childData, childId], callback);
};

exports.delete = (childId, callback) => {
  const sql = "DELETE FROM children WHERE id = ?";
  db.query(sql, [childId], callback);
};

exports.getById = (childId, callback) => {
  const sql = "SELECT * FROM children WHERE id = ?";
  db.query(sql, [childId], callback);
};

exports.getByParentId = (parentId, callback) => {
  const sql = "SELECT * FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.deleteByParentId = (parentId, callback) => {
  const sql = "DELETE FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};
