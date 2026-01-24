// const router = require("express").Router();
// const controller = require("../controllers/adminController");

// router.get("/dashboard", controller.dashboard);
// module.exports = router;


const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");


router.get("/dashboard", controller.dashboard);


router.get("/search", controller.search);

module.exports = router;
