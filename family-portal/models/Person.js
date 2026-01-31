const db = require("../config/db");

exports.getByUserId = (userId) => {
  return db.query(
    "SELECT * FROM persons WHERE user_id = ?",
    [userId]
  );
};
