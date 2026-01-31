const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "sandhiya@sowmiya2004",
  database: "survey_app",
  // socketPath: '/tmp/mysql.sock',
  port:'3306',

});

db.getConnection()
  .then((connection) => {
    console.log("MySQL Database connected successfully.");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL Database:", err);
  });



module.exports = db;
