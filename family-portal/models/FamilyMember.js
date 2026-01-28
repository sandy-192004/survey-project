const db = require("../config/db");

exports.create = (memberData, callback) => {
  const sql = "INSERT INTO family_members SET ?";
  db.query(sql, memberData, callback);
};

exports.update = (memberId, memberData, callback) => {
  const sql = "UPDATE family_members SET ? WHERE id = ?";
  db.query(sql, [memberData, memberId], callback);
};

exports.delete = (memberId, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ?";
  db.query(sql, [memberId], callback);
};

exports.getById = (memberId, callback) => {
  const sql = "SELECT * FROM family_members WHERE id = ?";
  db.query(sql, [memberId], callback);
};

exports.getByUserId = (userId, callback) => {
  const sql = "SELECT * FROM family_members WHERE user_id = ? ORDER BY member_type, created_at";
  db.query(sql, [userId], callback);
};

exports.getAllByUserId = (userId, callback) => {
  const sql = "SELECT * FROM family_members WHERE user_id = ? ORDER BY member_type, created_at";
  db.query(sql, [userId], callback);
};

exports.deleteByUserId = (userId, callback) => {
  const sql = "DELETE FROM family_members WHERE user_id = ?";
  db.query(sql, [userId], callback);
};

exports.getAll = (callback) => {
  const sql = "SELECT fm.*, u.email as user_email FROM family_members fm JOIN users u ON fm.user_id = u.id ORDER BY fm.created_at DESC";
  db.query(sql, callback);
};
