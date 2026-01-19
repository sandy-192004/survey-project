const express = require("express");
const router = express.Router();
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");

router.get("/export/excel", exportCtrl.excel);
router.get("/export/pdf", exportCtrl.pdf);


router.get("/", controller.showForm);
router.get("/family-form", controller.showForm);
router.post("/family-save", controller.saveFamily);
router.get("/dashboard", controller.dashboard);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);


module.exports = router;