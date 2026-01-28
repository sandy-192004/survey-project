const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const db = require("../config/db"); // Make sure this is your db connection

// Get all families as JSON
router.get('/families', (req, res) => {
    const query = 'SELECT * FROM family_table'; 
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
router.post("/edit/:id", controller.updateMember);

module.exports = router;
