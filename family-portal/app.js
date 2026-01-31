const express = require("express");
const session = require("express-session");
const path = require("path");

const familyRoutes = require("./routes/familyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminSearchRoutes = require("./routes/adminSearchRoutes");
const db = require("./config/db");

const app = express();

// ================== APP CONFIG ==================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================== SESSION ==================
app.use(
  session({
    secret: "family-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    }
  })
);

// ================== ROUTES ==================
app.use("/", familyRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminSearchRoutes);

// ================== ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message
  });
});

// ================== SERVER START ==================
app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
