const multer = require("multer");
const path = require("path");
const fs = require("node:fs");
const { persistFile, bucket } = require("../services/uploadStore");

// Local storage configuration
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// An upload succeeds only after its durable MongoDB copy is complete. Local
// files remain a cache for previews; Render redeploys can safely discard them.
const storage = {
  _handleFile(req, file, callback) {
    diskStorage._handleFile(req, file, async (error, info) => {
      if (error) return callback(error);
      try {
        const storedId = await persistFile(info.path, info.filename, file.mimetype);
        callback(null, { ...info, storedId });
      } catch (failure) {
        await fs.promises.unlink(info.path).catch(() => {});
        callback(failure);
      }
    });
  },
  _removeFile(req, file, callback) {
    const remove = Promise.resolve().then(() => file.storedId ? bucket().delete(file.storedId) : undefined);
    remove.then(() => diskStorage._removeFile(req, file, callback), callback);
  },
};

// File type filter - accepts all common document, video, and audio types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    // Video
    "video/mp4",
    "video/webm",
    "video/avi",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/mkv",
    "video/mpeg",
    "video/3gpp",
    "video/x-flv",
    "video/x-ms-wmv",
    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "audio/aac",
    "audio/x-wav",
    "audio/webm",
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Accept all files for flexibility
    console.log("Warning: Unexpected file type:", file.mimetype);
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

module.exports = upload;
