const db = require("../config/db");

exports.getByUserId = async (userId) => {
  const sql = "SELECT family_id FROM persons WHERE user_id = ?";
  const [rows] = await db.promise().query(sql, [userId]);
  return [rows];
};
