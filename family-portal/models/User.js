const db = require("../config/db");

exports.create = (userData, callback) => {
  const sql = "INSERT INTO users SET ?";
  db.query(sql, userData, callback);
};

exports.getByEmail = (email, callback) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], callback);
};
