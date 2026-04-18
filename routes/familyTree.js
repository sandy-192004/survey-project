const express = require("express");
const router = express.Router();
const familyTreeController = require("../controllers/familyTreeController");

router.get("/family-tree/:userId", familyTreeController.renderFamilyTreePage);
router.get("/api/family-tree/:personId", familyTreeController.getFamilyTreeApi);

module.exports = router;
