const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { isLoggedIn } = require("../middleware/auth");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");
const { processUpload } = require("../middleware/upload");


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
router.get("/family/edit/:id", isLoggedIn, controller.editForm);
router.post("/family/update/:id", isLoggedIn, processUpload, controller.updateFamily);
router.get("/family/delete/:id", isLoggedIn, controller.deleteFamily);

// ================== CHILD MANAGEMENT ==================
router.get("/add-child", isLoggedIn, controller.showAddChild);
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
  console.log("TEST ENDPOINT - req.body:", req.body);
  res.json({ success: true, message: "Test endpoint working" });
});

module.exports = router;
