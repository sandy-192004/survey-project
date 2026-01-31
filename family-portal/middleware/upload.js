const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

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

const resizeImage = async (filePath, width, height) => {
  await sharp(filePath)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toFile(filePath + '_resized');

  // Replace original with resized
  fs.renameSync(filePath + '_resized', filePath);
};

const processUpload = (req, res, next) => {
  upload.fields([
    { name: 'husbandPhoto', maxCount: 1 },
    { name: 'wifePhoto', maxCount: 1 },
    { name: 'childPhoto', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    // Process each uploaded file
    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          try {
            await resizeImage(file.path, 500, 500);
          } catch (error) {
            console.error('Error resizing image:', error);
            // Continue without failing the upload
          }
        }
      }
    }

    next();
  });
};

module.exports = { upload, processUpload };
