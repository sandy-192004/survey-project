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





app.set("view engine", "ejs");


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true
}));



app.use("/", familyRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminSearchRoutes);


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

