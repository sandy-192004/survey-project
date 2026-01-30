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
const createTables = () => {
  const familyTable = `
    CREATE TABLE IF NOT EXISTS family (
      family_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      wife_name VARCHAR(255),
      husband_photo VARCHAR(255),
      wife_photo VARCHAR(255),
      mobile VARCHAR(20),
      email VARCHAR(255),
      occupation VARCHAR(255),
      door_no VARCHAR(50),
      street VARCHAR(255),
      district VARCHAR(255),
      state VARCHAR(255),
      pincode VARCHAR(10)
    )
  `;

  const childrenTable = `
    CREATE TABLE IF NOT EXISTS children (
      family_id INT,
      child_name VARCHAR(255),
      date_of_birth DATE,
      occupation VARCHAR(255),
      FOREIGN KEY (family_id) REFERENCES family(family_id)
    )
  `;

  db.query(familyTable, (err) => {
    if (err) console.error('Error creating family table:', err);
    else console.log('Family table ready');
  });

  db.query(childrenTable, (err) => {
    if (err) console.error('Error creating children table:', err);
    else console.log('Children table ready');
  });
};

createTables();





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

app.use("/admin",adminRoutes)



app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

