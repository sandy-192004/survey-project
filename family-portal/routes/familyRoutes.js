const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { isLoggedIn } = require("../middleware/auth");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);

router.get("/", controller.showLogin);
router.get("/login", controller.showLogin);
router.post("/login", controller.login);
router.post("/register", controller.register);
router.get("/logout", controller.logout);
router.get("/family-form", controller.showForm);
router.post(
  "/save-family",
  isLoggedIn,
  upload.any(),
  controller.saveFamily
);
router.get("/family/:familyId", controller.viewFamily);
router.get("/dashboard", isLoggedIn, controller.checkFamily);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", upload.any(), controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);
router.get("/family", controller.myFamily);
router.get("/my-family", controller.myFamily);
router.get("/my-family-json", controller.getMyFamilyJson);
router.get("/add-child", controller.showAddChild);
router.post("/add-child", upload.any(), controller.addChild);

// Placeholder routes for future features
router.get("/pooja-booking", (req, res) => {
  res.send("Pooja booking feature coming soon!");
});

router.get("/profile", (req, res) => {
  res.send("Profile feature coming soon!");
});

module.exports = router;
