require('dotenv').config();

const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "disneyTorn@123",
  database: process.env.DB_NAME || "admin_db",
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
