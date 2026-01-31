const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");
const { isLoggedIn } = require("../middleware/auth");

console.log("🧩 exportCtrl keys:", Object.keys(exportCtrl));
console.log("🧩 familyController keys:", Object.keys(controller));

// ================== EXPORT ROUTES ==================
router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);

// ================== AUTH ==================
router.get("/", controller.showLogin);
router.get("/login", controller.showLogin);
router.post("/login", controller.login);
router.get("/register", controller.showRegister);
router.post("/register", controller.register);
router.get("/logout", controller.logout);

// ================== DASHBOARD ==================
router.get("/dashboard", isLoggedIn, controller.dashboard);

// ================== FAMILY FORM ==================
router.get("/family-form", isLoggedIn, controller.showForm);
router.post("/save-family", isLoggedIn, upload.any(), controller.saveFamily);

// ================== FAMILY MANAGEMENT ==================
router.get("/my-family", isLoggedIn, controller.myFamily);
router.get("/my-family-json", isLoggedIn, controller.getMyFamilyJson);

// ================== PLACEHOLDERS ==================
router.get("/pooja-booking", (req, res) => {
  res.send("Pooja booking feature coming soon!");
});

router.get("/profile", (req, res) => {
  res.send("Profile feature coming soon!");
});

// ================== TEST ==================
router.post("/test-save-family", upload.any(), (req, res) => {
  console.log("🔍 TEST ENDPOINT - req.body:", req.body);
  res.json({ success: true, message: "Test endpoint working" });
});

module.exports = router;
