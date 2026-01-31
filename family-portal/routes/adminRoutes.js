// const router = require("express").Router();
// const controller = require("../controllers/adminController");

// router.get("/dashboard", controller.dashboard);
// module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const { upload } = require("../middleware/upload");


router.get("/dashboard", controller.dashboard);


router.get("/search", controller.search);


router.get("/view/:id", controller.viewMember);
router.get("/edit/:id", controller.editMember);
router.post("/edit/:id", controller.updateMember);
router.post("/add-child", upload.fields([{ name: 'photo', maxCount: 1 }]), controller.addChild);

module.exports = router;


