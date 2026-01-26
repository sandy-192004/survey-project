const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "DisneyTron@2345",
  database: "family_portal",
  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});


db.getConnection((err, connection) => {
  if (err) {
    console.log("DB Connection Failed:", err);
  } else {
    console.log("MySQL Connected Successfully");
    connection.release(); // release back to pool
  }
});


module.exports = db;

