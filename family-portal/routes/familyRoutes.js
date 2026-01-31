const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { isLoggedIn } = require("../middleware/auth");
const { isGuest } = require("../middleware/guest");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);

router.get("/", isGuest, controller.showLogin);
router.get("/login", isGuest, controller.showLogin);
router.post("/login", controller.login);
router.post("/register", controller.register);
router.get("/logout", controller.logout);
router.get("/family-form", controller.showFamilyForm);
router.post(
  "/save-family",
  isLoggedIn,
  upload.any(),
  controller.saveFamily
);
router.get("/dashboard", isLoggedIn, controller.dashboard);
router.get('/family', isLoggedIn, controller.familyLogic);
router.get('/my-family', isLoggedIn, controller.myFamily);
router.get('/my-family-json', isLoggedIn, controller.myFamilyJson);
router.get('/family/add', isLoggedIn, controller.showFamilyForm);
router.post('/family/save', isLoggedIn, upload.any(), controller.saveFamily);

// Placeholder routes for future features
router.get("/pooja-booking", (req, res) => {
  res.send("Pooja booking feature coming soon!");
});

router.get("/profile", (req, res) => {
  res.send("Profile feature coming soon!");
});

module.exports = router;
