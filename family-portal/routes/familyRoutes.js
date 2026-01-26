const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

// Configure multer for disk storage
const upload = multer({ dest: 'public/uploads/' });

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
router.post("/save", upload.any(), controller.saveFamily);
router.get("/dashboard", controller.dashboard);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", upload.any(), controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);
router.get("/my-family", controller.getMyFamily);
router.get("/my-family-json", controller.getMyFamilyJson);

module.exports = router;
