const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "sandhiya@sowmiya2004",
  database: "survey_app",
  // socketPath: '/tmp/mysql.sock',
  port:'3306',

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



