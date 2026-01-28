const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "DisneyTron@2345",
  database: "family_portal",
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
