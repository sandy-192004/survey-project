const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// Create directories
const dirs = [
  path.join(__dirname, "../uploads/parent"),
  path.join(__dirname, "../uploads/children"),
  path.join(__dirname, "../uploads/siblings")
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname.includes("husband") || 
        file.fieldname.includes("wife") ||
        file.fieldname.includes("father") || 
        file.fieldname.includes("mother")) {
      cb(null, path.join(__dirname, "../uploads/parent"));
    } else if (file.fieldname.includes("siblings") || 
               file.fieldname.includes("sibling")) {
      cb(null, path.join(__dirname, "../uploads/siblings"));
    } else {
      cb(null, path.join(__dirname, "../uploads/children"));
    }
  },
  filename: (req, file, cb) => {
    let originalExt = path.extname(file.originalname).toLowerCase();
    if (!originalExt) originalExt = ".png";
    const uniqueName = Date.now() + "_" + Math.round(Math.random() * 1e9) + originalExt;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff"];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, GIF, and TIFF formats allowed"), false);
    } else {
      cb(null, true);
    }
  }
});

// Image processing functions
const resizeImage = async (filePath) => {
  try {
    await sharp(filePath)
      .resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .toBuffer()
      .then((data) => fs.writeFileSync(filePath, data));
  } catch (err) {
    console.error("Error resizing image:", err);
  }
};

const compressImageToSize = async (filePath, maxSizeKB = 50) => {
  try {
    const maxSizeBytes = maxSizeKB * 1024;
    let quality = 80;
    let currentSize = fs.statSync(filePath).size;

    const metadata = await sharp(filePath).metadata();
    const format = metadata.format;

    while (currentSize > maxSizeBytes && quality >= 10) {
      const tempPath = filePath + "_compressed";
      let sharpInstance = sharp(filePath);
      if (["jpeg", "jpg", "png", "webp"].includes(format)) {
        sharpInstance = sharpInstance.toFormat("jpeg", { quality });
      } else {
        sharpInstance = sharpInstance.jpeg({ quality });
      }
      await sharpInstance.toFile(tempPath);
      fs.renameSync(tempPath, filePath);
      currentSize = fs.statSync(filePath).size;
      quality -= 10;
    }
  } catch (err) {
    console.error("Error compressing image:", err);
  }
};

// Dynamic field definition for file uploads
const getUploadFields = () => {
  const fields = [
    { name: "husband[photo]", maxCount: 1 },
    { name: "husband[father_photo]", maxCount: 1 },
    { name: "husband[mother_photo]", maxCount: 1 },
    { name: "wife[photo]", maxCount: 1 },
    { name: "wife[father_photo]", maxCount: 1 },
    { name: "wife[mother_photo]", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "husband_photo", maxCount: 1 },
    { name: "wife_photo", maxCount: 1 }
  ];

  // Add children photo fields (up to 10 children)
  for (let i = 0; i < 10; i++) {
    fields.push({ name: `children[${i}][photo]`, maxCount: 1 });
  }

  // Add sibling photo fields (up to 10 siblings each side)
  for (let i = 0; i < 10; i++) {
    fields.push({ name: `siblings[husband][${i}][photo]`, maxCount: 1 });
    fields.push({ name: `siblings[wife][${i}][photo]`, maxCount: 1 });
  }

  return fields;
};

const processUpload = (req, res, next) => {
  upload.fields(getUploadFields())(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return next(err);
    }

    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          try {
            await resizeImage(file.path);
            const stats = fs.statSync(file.path);
            const fileSizeKB = stats.size / 1024;
            if (fileSizeKB > 50) {
              await compressImageToSize(file.path, 50);
            }
          } catch (error) {
            console.error("Error processing image:", error);
          }
        }
      }
    }

    next();
  });
};

module.exports = { upload, processUpload, getUploadFields };
