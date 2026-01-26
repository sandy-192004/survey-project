const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const familyRoutes = require("./routes/familyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const db = require("./config/db");
const app = express();

// Initialize database tables





app.set("view engine", "ejs");

// Middleware setup - IMPORTANT ORDER
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true
}));



app.use("/", familyRoutes);
app.use("/admin", adminRoutes);


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

