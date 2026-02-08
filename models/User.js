const db = require("../config/db");

exports.create = async (userData) => {
  const sql = "INSERT INTO users SET ?";
  const [result] = await db.query(sql, userData);
  return result.insertId;
};

exports.getByEmail = async (email) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  const [results] = await db.query(sql, [email]);
  return results;
};

exports.getById = async (id) => {
  const sql = "SELECT id, email, created_at FROM users WHERE id = ?";
  const [results] = await db.query(sql, [id]);
  return results[0];
};

exports.deleteById = async (id) => {
  const sql = "DELETE FROM users WHERE id = ?";
  const [result] = await db.query(sql, [id]);
  return result.affectedRows > 0;
};
