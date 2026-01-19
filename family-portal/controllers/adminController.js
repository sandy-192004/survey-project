const db = require("../config/db");

exports.dashboard = (req, res) => {
  db.query("SELECT COUNT(*) total FROM family_members", (err, r) => {
    res.render("admin/dashboard", { total: r[0].total });
  });
};
