const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure directories exist
const parentsDir = "uploads/parents";
const childrenDir = "uploads/children";
if (!fs.existsSync(parentsDir)) {
  fs.mkdirSync(parentsDir, { recursive: true });
}
if (!fs.existsSync(childrenDir)) {
  fs.mkdirSync(childrenDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname.includes("parent")) {
      cb(null, parentsDir);
    } else {
      cb(null, childrenDir);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files allowed"), false);
    } else {
      cb(null, true);
    }
  }
});

module.exports = upload;
