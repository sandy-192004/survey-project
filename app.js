const express = require("express");
const session = require("express-session");
require('dotenv').config();
global.__dotenvConfigured = true;
// const hemlet = require("helmet");

const path = require("path");

const familyRoutes = require("./routes/familyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminSearchRoutes = require("./routes/adminSearchRoutes");
const db = require("./config/db");

const app = express();

// app.use(hemlet());

// app.use(hemlet());





app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
app.use("/images", express.static(path.join(__dirname, "public", "images")));

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
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message
  });
});

// ================== SERVER START ==================

app.listen(3001, () => {
  console.log(`Server running on http://localhost:3001`);
});        

function startServer(port) {
  const server = app.listen(port, HOST, () => {
    console.log(`Server running on port http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      const nextPort = Number(port) + 1;
      console.warn(`Port ${port} is in use. Retrying on port ${nextPort}...`);
      setTimeout(() => startServer(nextPort), 200);
      return;
    }

    throw err;
  });
}

startServer(BASE_PORT);


     

