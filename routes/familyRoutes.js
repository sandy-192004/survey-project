const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");
const { isLoggedIn } = require("../middleware/auth");
const { processUpload } = require("../middleware/upload");



router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);


router.get("/", controller.showLogin);
router.get("/login", controller.showLogin);
router.post("/login", controller.login);
router.get("/register", controller.showRegister);
router.post("/register", controller.register);
router.get("/logout", controller.logout);




router.get("/dashboard", isLoggedIn, controller.dashboard);

// ================== FAMILY FORM ==================

router.get("/family-form", isLoggedIn, controller.showForm);
router.post("/save-family", isLoggedIn, processUpload, controller.saveFamily);


// ================== FAMILY MANAGEMENT ==================
router.get("/family/:familyId", isLoggedIn, controller.viewFamily);
router.get("/my-family", isLoggedIn, controller.myFamily);
router.get("/my-family-json", controller.getMyFamilyJson);

// Add child route
router.post("/add-child", isLoggedIn, upload.single('photo'), controller.addChild);

// Edit routes
router.get("/family-edit", isLoggedIn, controller.showFamilyEdit);
router.get("/member-edit/:id", isLoggedIn, controller.showMemberEdit);
router.get("/get-child/:id", isLoggedIn, controller.getChild);
router.get("/get-member/:id", isLoggedIn, controller.getMember);
router.post("/update-husband", isLoggedIn, upload.single('photo'), controller.updateHusband);
router.post("/update-member/:id", isLoggedIn, upload.single('photo'), controller.updateMember);

// ================== DELETE FAMILY ==================
router.delete("/delete-family", isLoggedIn, controller.deleteFamily);

// ================== PLACEHOLDERS ==================
router.get("/pooja-booking", (req, res) => {
  res.render("pooja-booking");
});

router.get("/profile", (req, res) => {
  res.send("Profile feature coming soon!");
});

// ================== TEST ==================
router.post("/test-save-family", upload.any(), (req, res) => {
  console.log("TEST ENDPOINT - req.body:", req.body);
  res.json({ success: true, message: "Test endpoint working" });
});

module.exports = router;