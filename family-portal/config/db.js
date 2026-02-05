const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "disneyTorn@123",
  database: "admin_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Use promise wrapper
const db = pool.promise();

// Test DB connection
db.getConnection()
  .then((connection) => {
    console.log("MySQL Database connected successfully.");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL Database:", err.message);
  });

module.exports = db;
