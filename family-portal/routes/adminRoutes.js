const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/adminController");



const exportController = require("../controllers/exportController");


const db = require("../config/db");


const db = require("../config/db");

const upload = require("../middleware/upload");

// Get all families as JSON
router.get('/families', (req, res) => {
    const query = 'SELECT * FROM family';
    db.query(query, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error loading data');
        }
        res.json(results);
    });
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

router.get("/export/excel", exportController.exportToExcel);
router.get("/export/pdf", exportController.exportToPdf);

module.exports = router;
