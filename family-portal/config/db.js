const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "sandhiya@sowmiya2004",
  database: "survey_app",
  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the database as id " + connection.threadId);
  }
});





module.exports = db;
