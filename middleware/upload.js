const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");


const parentsDir = path.join(__dirname, "../uploads/parents");
const childrenDir = path.join(__dirname, "../uploads/children");

[parentsDir, childrenDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (
      file.fieldname.includes("parent") ||
      file.fieldname.includes("husband") ||
      file.fieldname.includes("wife")
    ) {
      cb(null, parentsDir);
    } else {
      cb(null, childrenDir);
    }
  },

  filename: (req, file, cb) => {

    let originalExt = path.extname(file.originalname).toLowerCase();

    // If no extension found, default to .png
    if (!originalExt) originalExt = ".png";

    const uniqueName =
      Date.now() + "_" + Math.round(Math.random() * 1e9) + originalExt;

    cb(null, uniqueName);
  },
});


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/tiff",
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(
        new Error("Only JPEG, PNG, WebP, GIF, and TIFF image formats are allowed"),
        false
      );
    } else {
      cb(null, true);
    }
  },
});


const resizeImage = async (filePath) => {
  try {
    await sharp(filePath)
      .resize(500, 500, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer()
      .then((data) => fs.writeFileSync(filePath, data));
  } catch (err) {
    console.error("Error resizing image:", err);
  }
};


const compressImageToSize = async (filePath, maxSizeKB = 250) => {
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


const processUpload = (req, res, next) => {
  upload.fields([
    { name: "parent[husband_photo]", maxCount: 1 },
    { name: "parent[wife_photo]", maxCount: 1 },
    { name: "children[0][photo]", maxCount: 1 },
    { name: "children[1][photo]", maxCount: 1 },
    { name: "children[2][photo]", maxCount: 1 },
    { name: "children[3][photo]", maxCount: 1 },
    { name: "children[4][photo]", maxCount: 1 },
    { name: "children[5][photo]", maxCount: 1 },
    { name: "children[6][photo]", maxCount: 1 },
    { name: "children[7][photo]", maxCount: 1 },
    { name: "children[8][photo]", maxCount: 1 },
    { name: "children[9][photo]", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "husband_photo", maxCount: 1 },
    { name: "wife_photo", maxCount: 1 },
  ])(req, res, async (err) => {
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

            if (fileSizeKB > 250) {
              await compressImageToSize(file.path, 250);
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


module.exports = { upload, processUpload };
