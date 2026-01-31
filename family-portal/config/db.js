const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "nidhi@20",
  database: "survey_app",
  // socketPath: '/tmp/mysql.sock',
  port:'3306'
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {

    console.log("MySQL Connected Successfully");
    connection.release(); 

   

  }
});



module.exports = db;
