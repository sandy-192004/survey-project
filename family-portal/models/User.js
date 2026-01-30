const db = require("../config/db");

exports.create = (userData, callback) => {
  const sql = "INSERT INTO users SET ?";
  db.query(sql, userData, callback);
};

exports.getByEmail = (email, callback) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], callback);
};

exports.getById = (id, callback) => {
  const sql = "SELECT id, email, created_at FROM users WHERE id = ?";
  db.query(sql, [id], callback);
};

exports.deleteById = (id, callback) => {
  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [id], callback);
};