const router = require("express").Router();
const controller = require("../controllers/adminController");

router.get("/dashboard", controller.dashboard);
module.exports = router;
