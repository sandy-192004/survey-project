// const router = express.Router();
// const upload = require("../middleware/upload");
// const { isLoggedIn } = require("../middleware/auth");
// const controller = require("../controllers/familyController");
// const exportCtrl = require("../controllers/exportController");

const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { isLoggedIn } = require("../middleware/auth");
const controller = require("../controllers/familyController");
const exportCtrl = require("../controllers/exportController");
