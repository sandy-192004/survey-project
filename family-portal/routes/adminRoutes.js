const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/adminController");
<<<<<<< HEAD
const db = require("../config/db");
=======
const upload = require("../middleware/upload");
>>>>>>> 93bb59deb99102196924651591fa6711e7edddfa

const upload = multer({ dest: 'public/uploads/' });

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
<<<<<<< HEAD
router.post("/edit/:id", upload.any(), controller.updateMember);
=======
router.post("/edit/:id", controller.updateMember);
router.post("/add-child", upload.fields([{ name: 'photo', maxCount: 1 }]), controller.addChild);

module.exports = router;
>>>>>>> 93bb59deb99102196924651591fa6711e7edddfa


module.exports = router;