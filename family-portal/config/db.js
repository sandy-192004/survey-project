const mysql = require("mysql2");

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",

  password: "Nidhi@20",
  database: "survey_app",
  port: 3306

  password: "disneyTorn@123",
  database: "admin_db",
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


