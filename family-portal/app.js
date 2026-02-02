const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");


const familyRoutes = require("./routes/familyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminSearchRoutes = require("./routes/adminSearchRoutes");
const db = require("./config/db");
const app = express();


// Initialize database tables
const initDB = async () => {
  try {
    // Create families table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS families (
        id INT AUTO_INCREMENT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create family_members table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        family_id INT,
        member_type ENUM('parent', 'child') NOT NULL,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(50),
        mobile VARCHAR(15),
        occupation VARCHAR(100),
        dob DATE,
        gender ENUM('Male', 'Female', 'Other'),
        door_no VARCHAR(50),
        street VARCHAR(255),
        district VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        photo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
      )
    `);

    console.log("Database tables initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

initDB();




app.set("view engine", "ejs");


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(session({
  secret: "family-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true
  }
}));



app.use("/", familyRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminSearchRoutes);



app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
