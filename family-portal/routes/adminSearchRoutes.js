const express = require("express");
const router = express.Router();
const adminSearchController = require("../controllers/adminSearchController");

router.get("/search", adminSearchController.searchFamilies);

module.exports = router;


