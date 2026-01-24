const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);

router.get("/", controller.showLogin);
router.get("/login", controller.showLogin);
router.post("/login", controller.login);
router.get("/register", controller.showRegister);
router.post("/register", controller.register);
router.get("/logout", controller.logout);
router.get("/family-form", controller.showForm);
router.post("/family-save", upload.any(), controller.saveFamily);
router.get("/dashboard", controller.dashboard);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", upload.any(), controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);


module.exports = router;