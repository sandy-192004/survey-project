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
router.get("/register", controller.showRegister);
router.post("/register", controller.register);
router.get("/logout", controller.logout);
router.get("/check-family", controller.checkFamily);
router.get("/family-form", controller.showForm);
router.post(
  "/save-family",
  upload.fields([
    { name: 'parent[husband_photo]' },
    { name: 'parent[wife_photo]' },
    { name: 'children[0][photo]', maxCount: 1 },
    { name: 'children[1][photo]', maxCount: 1 },
    { name: 'children[2][photo]', maxCount: 1 },
    { name: 'children[3][photo]', maxCount: 1 },
    { name: 'children[4][photo]', maxCount: 1 },
    { name: 'children[5][photo]', maxCount: 1 },
    { name: 'children[6][photo]', maxCount: 1 },
    { name: 'children[7][photo]', maxCount: 1 },

    { name: 'children[8][photo]', maxCount: 1 },
    { name: 'children[9][photo]', maxCount: 1 }
  ]),
  controller.saveFamily
);
router.get("/family/:familyId", controller.viewFamily);
router.get("/dashboard", controller.dashboard);
router.get("/family/edit/:id", controller.editForm);
router.post("/family/update/:id", upload.any(), controller.updateFamily);
router.get("/family/delete/:id", controller.deleteFamily);
router.get("/family", controller.myFamily);
router.get("/my-family", controller.myFamily);
router.get("/my-family-json", controller.getMyFamilyJson);

module.exports = router;
