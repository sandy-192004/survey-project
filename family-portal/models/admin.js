const db = require("../config/db");

exports.findByEmail = (email) => {
  return db.query("SELECT * FROM admins WHERE email = ?", [email]);
};
