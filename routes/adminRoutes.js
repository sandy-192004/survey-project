// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const controller = require("../controllers/adminController");
// const familyController = require("../controllers/familyController"); // Newly added import for family controller

// const exportController = require("../controllers/exportController");


// const db = require("../config/db");
// const { upload, processUpload } = require("../middleware/upload");

// // Get all families as JSON
// router.get('/families', async (req, res) => {
//     try {
//         const [rows] = await db.query(`
//             SELECT f.id AS family_id, fm.*
//             FROM families f
//             JOIN family_members fm ON fm.family_id = f.id
//             ORDER BY f.id
//         `);
//         res.json(rows);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error loading data');
//     }
// });

// // Dashboard page
// router.get("/dashboard", controller.dashboard);

// // Search
// router.get("/search", controller.search);

// // Add Family - Reuse existing User-side form and logic
// router.get("/add-family", (req, res) => {
//   res.redirect("/family-form"); // Newly added route to reuse existing User add family form
// });

// // Create Family - Direct access without authentication
// router.get("/create-family", (req, res) => {
//   res.render("admin/create-family");
// });

// // POST Create Family
// router.post("/create-family", processUpload, controller.createFamily);

// // View and Edit routes
// router.get("/view/:id", controller.viewMember);
// router.get("/edit/:id", controller.editMember);
// router.post("/edit/:id", upload.any(), controller.updateMember);
// router.post("/add-child", upload.fields([{ name: 'photo', maxCount: 1 }]), controller.addChild);

// router.get("/export/excel", exportController.exportToExcel);
// router.get("/export/pdf", exportController.exportToPdf);

// // Create Family (Admin)
// router.get("/create-family", (req, res) => {
//   res.render("admin/create-family");
// });
// router.post("/create-family", upload.any(), controller.createFamily);

// // Delete family
// router.post("/delete/:id", controller.deleteFamily);

// // Logout
// router.post("/logout", controller.logout);




// module.exports = router;



const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/adminController");
const familyController = require("../controllers/familyController"); // for family reuse
const exportController = require("../controllers/exportController");
const db = require("../config/db");
const { upload, processUpload } = require("../middleware/upload");

// =======================
// GET all families as JSON
// =======================
router.get("/families", async (req, res) => {
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
    res.status(500).send("Error loading data");
  }
});

// =======================
// ADMIN DASHBOARD
// =======================
router.get("/dashboard", controller.dashboard);

// =======================
// SEARCH
// =======================
router.get("/search", controller.search);

// =======================
// ADD FAMILY (reuse user form)
// =======================
router.get("/add-family", (req, res) => {
  res.redirect("/family-form");
});

// =======================
// CREATE FAMILY
// =======================
router.get("/create-family", (req, res) => {
  res.render("admin/create-family");
});
router.post("/create-family", processUpload, controller.createFamily);

// =======================
// VIEW / EDIT FAMILY
// =======================
router.get("/view/:id", controller.viewMember);
router.get("/edit/:id", controller.editMember);
router.post("/edit/:id", upload.any(), controller.updateMember);

// =======================
// AJAX PHOTO UPLOAD (NEW)
// =======================
// This route handles live uploads from the edit form (Browse/Take Photo)
router.post("/upload-photo/:familyId", upload.any(), controller.uploadPhoto);

// =======================
// ADD CHILD
// =======================
router.post("/add-child", upload.fields([{ name: "photo", maxCount: 1 }]), controller.addChild);

// =======================
// EXPORTS
// =======================
router.get("/export/excel", exportController.exportToExcel);
router.get("/export/pdf", exportController.exportToPdf);

// =======================
// DELETE FAMILY
// =======================
router.post("/delete/:id", controller.deleteFamily);

// =======================
// LOGOUT
// =======================
router.post("/logout", controller.logout);

module.exports = router;
