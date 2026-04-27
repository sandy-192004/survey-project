const express = require("express");
const router = express.Router();
const familyTreeController = require("../controllers/familyTreeController");
const familyTreeNavController = require("../controllers/familytreenavcontroller");

router.get("/family-tree/:userId", familyTreeController.renderFamilyTreePage);
router.get("/api/family-tree/:personId", familyTreeController.getFamilyTreeApi);
router.get("/api/family-tree-user/:userId", familyTreeController.getFamilyTreeByUserApi);

// Support both GET and POST for navigation endpoint
router.get("/admin/family-tree/navigate/find-related", familyTreeNavController.findRelatedFamilyTree);
router.post("/admin/family-tree/navigate/find-related", familyTreeNavController.findRelatedFamilyTree);

module.exports = router;
