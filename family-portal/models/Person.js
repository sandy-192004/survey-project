const db = require("../config/db");

exports.getByUserId = async (userId) => {
  const [rows] = await db.query(
    "SELECT * FROM persons WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
};
