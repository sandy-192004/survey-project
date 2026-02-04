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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, GIF, and TIFF image formats are allowed"), false);
    } else {
      cb(null, true);
    }
  }
});

const resizeImage = async (filePath) => {
  await sharp(filePath)
    .resize(500, 500, {
      fit: 'inside',      // keeps aspect ratio (better than 'cover')
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 }) // Start with reasonable quality
    .toFile(filePath + '_resized');

  fs.renameSync(filePath + '_resized', filePath);
};

const compressImageToSize = async (filePath, maxSizeKB = 250) => {
  const maxSizeBytes = maxSizeKB * 1024;
  let quality = 80; // Start slightly lower
  let currentSize = fs.statSync(filePath).size;

  const metadata = await sharp(filePath).metadata();
  const format = metadata.format;

  while (currentSize > maxSizeBytes && quality >= 10) {
    let tempPath = filePath + '_compressed';

    let sharpInstance = sharp(filePath);

    if (format === 'jpeg' || format === 'jpg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    }
    else if (format === 'png') {
      // Convert PNG to JPEG (best way to reduce size)
      sharpInstance = sharpInstance.jpeg({ quality });
    }
    else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }
    else {
      // Convert all other formats to JPEG
      sharpInstance = sharpInstance.jpeg({ quality });
    }

    await sharpInstance.toFile(tempPath);
    fs.renameSync(tempPath, filePath);

    currentSize = fs.statSync(filePath).size;
    quality -= 10; // Reduce step-by-step
  }
};

const processUpload = (req, res, next) => {
  upload.fields([
    { name: 'parent[husband_photo]', maxCount: 1 },
    { name: 'parent[wife_photo]', maxCount: 1 },
    { name: 'children[0][photo]', maxCount: 1 },
    { name: 'children[1][photo]', maxCount: 1 },
    { name: 'children[2][photo]', maxCount: 1 },
    { name: 'children[3][photo]', maxCount: 1 },
    { name: 'children[4][photo]', maxCount: 1 },
    { name: 'children[5][photo]', maxCount: 1 },
    { name: 'children[6][photo]', maxCount: 1 },
    { name: 'children[7][photo]', maxCount: 1 },
    { name: 'children[8][photo]', maxCount: 1 },
    { name: 'children[9][photo]', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'husband_photo', maxCount: 1 },
    { name: 'wife_photo', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    // Process each uploaded file
    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          try {
            await resizeImage(file.path);
            // Check file size after resizing
            const stats = fs.statSync(file.path);
            const fileSizeKB = stats.size / 1024;
            if (fileSizeKB > 250) {
              await compressImageToSize(file.path, 250);
            }
          } catch (error) {
            console.error('Error processing image:', error);
            // Continue without failing the upload
          }
        }
      }
    }

    next();
  });
};

module.exports = { upload, processUpload };
