const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");
const { isLoggedIn } = require("../middleware/auth");
const { processUpload } = require("../middleware/upload");

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

// ================== FAMILY CHECK ==================
router.get("/family", isLoggedIn, controller.familyCheck);

// ================== FAMILY FORM ==================
router.get("/family-form", isLoggedIn, controller.showForm);
router.post("/save-family", isLoggedIn, processUpload, controller.saveFamily);

// ================== FAMILY MANAGEMENT ==================
router.get("/family/:familyId", isLoggedIn, controller.viewFamily);
router.get("/my-family", isLoggedIn, controller.myFamily);
router.get("/my-family-json", isLoggedIn, controller.getMyFamilyJson);

// ================== CHILD MANAGEMENT ==================
router.post("/add-child", isLoggedIn, processUpload, controller.addChild);
router.get("/get-children/:userId", isLoggedIn, controller.getChildren);
router.get("/get-child/:id", isLoggedIn, controller.getChild);
router.put("/update-child/:id", isLoggedIn, processUpload, controller.updateChild);
router.delete("/delete-child/:id", isLoggedIn, controller.deleteChild);

// ================== PARENT EDIT ==================
router.get("/family-edit", isLoggedIn, controller.showFamilyEdit);
router.post("/update-family", isLoggedIn, processUpload, controller.updateFamily);
router.get("/member-edit/:id", isLoggedIn, controller.showMemberEdit);
router.post("/update-member/:id", isLoggedIn, processUpload, controller.updateMember);

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
