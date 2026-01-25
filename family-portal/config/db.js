const mysql = require("mysql2");

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "disneyTorn@123",
  database: "family_portal",
  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});

module.exports = db;

// connection.connect(err => {
//   if (err) {
//     console.error(err);
//     return;
//   }
//   console.log('MySQL connected via socket!');
// });