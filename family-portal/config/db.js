const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",

  password: "disneyTorn@123",
  database: "admin_db",

  password: "nidhi@20",
  database: "survey_app",

  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});


db.getConnection((err, connection) => {
  if (err) {
    console.log("DB Connection Failed:", err);
  } else {
    console.log("MySQL Connected Successfully");

    connection.release(); // release back to pool

    connection.release(); 


  }
});

module.exports = db;