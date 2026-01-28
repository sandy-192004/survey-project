const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);

router.get("/", controller.showLogin);
router.get("/login", controller.showLogin);
router.post("/login", controller.login);
router.get("/register", controller.showRegister);
router.post("/register", controller.register);
router.get("/logout", controller.logout);
router.get("/check-family", controller.checkFamily);
router.get("/family-form", controller.showForm);
router.post(
  "/save-family",
  upload.any(),       // handles all file inputs
  controller.saveFamily
);
router.get("/dashboard", controller.dashboard);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", upload.any(), controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);
router.get("/my-family", controller.getMyFamily);
router.get("/my-family-json", controller.getMyFamilyJson);

module.exports = router;
