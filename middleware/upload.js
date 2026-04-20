const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

/* ================= FOLDERS ================= */
const parentDir = path.join(__dirname, "../uploads/parent");
const childrenDir = path.join(__dirname, "../uploads/children");
const siblingsDir = path.join(__dirname, "../uploads/siblings");
const mainDir = path.join(__dirname, "../uploads/main");

[parentDir, childrenDir, siblingsDir, mainDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* ================= STORAGE ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (
      file.fieldname.includes("father") ||
      file.fieldname.includes("mother") ||
      file.fieldname.includes("parent")
    ) {
      cb(null, parentDir);
    } else if (
      file.fieldname.includes("my_") ||
      file.fieldname.includes("spouse") ||
      file.fieldname.includes("husband") ||
      file.fieldname.includes("wife")
    ) {
      cb(null, mainDir);
    } else if (file.fieldname.includes("siblings")) {
      cb(null, siblingsDir);
    } else {
      cb(null, childrenDir);
    }
  },

  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) ext = ".png";
    const fileName = Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  },
});

/* ================= MULTER ================= */
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

/* ================= IMAGE PROCESS ================= */
const resizeImage = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return;
    const data = await sharp(filePath)
      .resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .toBuffer();

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, data);
  } catch (err) {
    console.error("Resize error:", err);
  }
};

const compressImageToSize = async (filePath, maxKB = 50) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return;
    let size = fs.statSync(filePath).size;
    let quality = 80;

    while (size > maxKB * 1024 && quality >= 10) {
      const temp = filePath + "_tmp.jpg";

      await sharp(filePath)
        .jpeg({ quality })
        .toFile(temp);

      fs.renameSync(temp, filePath);
      size = fs.statSync(filePath).size;
      quality -= 10;
    }
  } catch (err) {
    console.error("Compress error:", err);
  }
};

/* ================= FIELDS ================= */
const uploadFields = [
  { name: "father_image", maxCount: 1 },
  { name: "mother_image", maxCount: 1 },
  { name: "my_image", maxCount: 1 },
  { name: "spouse_image", maxCount: 1 },
  { name: "photo", maxCount: 1 },
  { name: "husband_photo", maxCount: 1 },
  { name: "wife_photo", maxCount: 1 },
];

// Dynamic fields
for (let i = 0; i < 50; i++) {
  uploadFields.push({ name: `children[${i}][image]`, maxCount: 1 });
  uploadFields.push({ name: `siblings[${i}][image]`, maxCount: 1 });
}

/* ================= MIDDLEWARE ================= */
const processUpload = (req, res, next) => {
  upload.fields(uploadFields)(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return next(err);
    }

    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          try {
            if (!file?.path || !fs.existsSync(file.path)) {
              continue;
            }

            await resizeImage(file.path);

            if (!fs.existsSync(file.path)) {
              continue;
            }

            const sizeKB = fs.statSync(file.path).size / 1024;
            if (sizeKB > 50) {
              await compressImageToSize(file.path, 50);
            }
          } catch (error) {
            console.error("Image processing error:", error);
          }
        }
      }
    }

    next();
  });
};

module.exports = { upload, processUpload };