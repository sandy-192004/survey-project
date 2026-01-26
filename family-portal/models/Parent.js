const db = require("../config/db");

exports.create = (parentData, callback) => {
  const sql = "INSERT INTO parents SET ?";
  db.query(sql, parentData, callback);
};

exports.update = (parentId, parentData, callback) => {
  const sql = "UPDATE parents SET ? WHERE id = ?";
  db.query(sql, [parentData, parentId], callback);
};

exports.delete = (parentId, callback) => {
  const sql = "DELETE FROM parents WHERE id = ?";
  db.query(sql, [parentId], callback);
};

exports.getById = (parentId, callback) => {
  const sql = "SELECT * FROM parents WHERE id = ?";
  db.query(sql, [parentId], callback);
};

exports.getByMobile = (mobile, callback) => {
  const sql = "SELECT * FROM parents WHERE mobile = ?";
  db.query(sql, [mobile], callback);
};

exports.getAll = (callback) => {
  const sql = "SELECT * FROM parents ORDER BY created_at DESC";
  db.query(sql, callback);
};

exports.getByEmail = (email, callback) => {
  const sql = "SELECT * FROM parents WHERE email = ?";
  db.query(sql, [email], callback);
};
