const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const parentDir = path.join(__dirname, "../uploads/parent");
const childrenDir = path.join(__dirname, "../uploads/children");
const siblingsDir = path.join(__dirname, "../uploads/siblings");
const mainDir = path.join(__dirname, "../uploads/main");

[parentDir, childrenDir, siblingsDir, mainDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (
      file.fieldname.includes("parent") ||
      file.fieldname.includes("husband") ||
      file.fieldname.includes("wife") ||
      file.fieldname.includes("father") ||
      file.fieldname.includes("mother") ||
      file.fieldname.includes("spouse") ||
      file.fieldname.includes("my_image")
    ) {
    if (file.fieldname.includes("father") || file.fieldname.includes("mother") || file.fieldname.includes("parent")) {
      cb(null, parentDir);
    } else if (file.fieldname.includes("my_") || file.fieldname.includes("spouse")) {
      cb(null, mainDir);
    } else if (file.fieldname.includes("siblings")) {
      cb(null, siblingsDir);
    } else {
      cb(null, childrenDir);
    }
  },
  filename: (req, file, cb) => {
    let originalExt = path.extname(file.originalname).toLowerCase();
    if (!originalExt) originalExt = ".png";
    const uniqueName = Date.now() + "_" + Math.round(Math.random() * 1e9) + originalExt;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff"];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("Only images allowed"), false);
    } else {
      cb(null, true);
    }
  },
});

const resizeImage = async (filePath) => {
  try {
    await sharp(filePath).resize(500, 500, { fit: "inside", withoutEnlargement: true }).toBuffer().then((data) => fs.writeFileSync(filePath, data));
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
      if (["jpeg", "jpg", "png", "webp"].includes(format)) sharpInstance = sharpInstance.toFormat("jpeg", { quality });
      else sharpInstance = sharpInstance.jpeg({ quality });
      await sharpInstance.toFile(tempPath);
      fs.renameSync(tempPath, filePath);
      currentSize = fs.statSync(filePath).size;
      quality -= 10;
    }
  } catch (err) { }
};

const uploadFields = [
  { name: "father_image", maxCount: 1 },
  { name: "mother_image", maxCount: 1 },
  { name: "my_image", maxCount: 1 },
  { name: "spouse_image", maxCount: 1 }
];

const processUpload = (req, res, next) => {
  const fields = [
    { name: "parent[husband_photo]", maxCount: 1 },
    { name: "parent[wife_photo]", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "husband_photo", maxCount: 1 },
    { name: "wife_photo", maxCount: 1 },
    { name: "father_image", maxCount: 1 },
    { name: "mother_image", maxCount: 1 },
    { name: "my_image", maxCount: 1 },
    { name: "spouse_image", maxCount: 1 },
  ];

  for (let index = 0; index < 50; index += 1) {
    fields.push({ name: `children[${index}][photo]`, maxCount: 1 });
    fields.push({ name: `children[${index}][image]`, maxCount: 1 });
    fields.push({ name: `siblings[${index}][photo]`, maxCount: 1 });
    fields.push({ name: `siblings[${index}][image]`, maxCount: 1 });
  }

  upload.fields(fields)(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return next(err);
    }
for (let i = 0; i <= 20; i++) {
  uploadFields.push({ name: `children[${i}][image]`, maxCount: 1 });
  uploadFields.push({ name: `siblings[${i}][image]`, maxCount: 1 });
}

const processUpload = (req, res, next) => {
  upload.fields(uploadFields)(req, res, async (err) => {
    if (err) return next(err);
    if (req.files) {
      for (const field in req.files) {
        for (const file of req.files[field]) {
          try {
            await resizeImage(file.path);
            if (fs.statSync(file.path).size / 1024 > 50) await compressImageToSize(file.path, 50);
          } catch (error) { console.error(error); }
        }
      }
    }
    next();
  });
};

module.exports = { upload, processUpload };