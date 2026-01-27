const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sandhiya@sowmiya2004",
  database: "survey_app",
  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});


db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed:", err);
  } else {
    console.log("MySQL Connected Successfully");
  }
});


module.exports = db;

