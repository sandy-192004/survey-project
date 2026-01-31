const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/adminController");

const db = require("../config/db");
const { upload } = require("../middleware/upload");


// Get all families as JSON
router.get('/families', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT f.id AS family_id, fm.*
            FROM families f
            JOIN family_members fm ON fm.family_id = f.id
            ORDER BY f.id
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading data');
    }
});

// Dashboard page
router.get("/dashboard", controller.dashboard);

// Search
router.get("/search", controller.search);


// router.get("/search", controller.search);

// View and Edit routes
router.get("/view/:id", controller.viewMember);
router.get("/edit/:id", controller.editMember);
router.post("/edit/:id", upload.any(), controller.updateMember);
router.post("/add-child", upload.fields([{ name: 'photo', maxCount: 1 }]), controller.addChild);

module.exports = router;
