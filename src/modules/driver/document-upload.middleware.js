
const multer = require("multer");

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const storage = multer.memoryStorage();

const uploadDriverDocuments = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per document
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only PDF, JPG, PNG and WEBP documents are allowed."
        )
      );
    }

    cb(null, true);
  },
}).fields([
  { name: "driversLicense", maxCount: 1 },
  { name: "identityDocument", maxCount: 1 },
  { name: "vehicleDocument", maxCount: 1 },
]);

module.exports = uploadDriverDocuments;
