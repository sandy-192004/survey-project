const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "disneyTorn@123",
  database: "admin_db",
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

db.getConnection((err, connection) => {
  if (err) {
    console.log("DB Connection Failed:", err);
  } else {
    console.log("MySQL Connected Successfully");
    connection.release(); // release back to pool
  }
});


module.exports = db;