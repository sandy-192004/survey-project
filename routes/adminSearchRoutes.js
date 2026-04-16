const express = require("express");
const router = express.Router();
const adminSearchController = require("../controllers/adminSearchController");
const { isAdmin } = require("../middleware/auth");

router.use(isAdmin);

router.get("/search", adminSearchController.searchFamilies);

module.exports = router;