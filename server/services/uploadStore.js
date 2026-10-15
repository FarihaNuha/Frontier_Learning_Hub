const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const mongoose = require("mongoose");

const uploadsDir = path.resolve(__dirname, "../../uploads");
const bucket = () => {
  if (!mongoose.connection.db) throw new Error("File storage is temporarily unavailable. Please retry the upload.");
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
};
const validFilename = name => typeof name === "string" && name.length > 0 && name !== "." && name !== ".." && !/[\\/\0]/.test(name);
const pending = new Map();

async function persistFile(filePath, filename, contentType) {
  if (!validFilename(filename)) throw new Error("Invalid upload filename");
  const store = bucket();
  const upload = store.openUploadStream(filename, { metadata: { contentType: contentType || "application/octet-stream" } });
  try {
    await pipeline(fs.createReadStream(filePath), upload);
    return upload.id;
  } catch (error) {
    await store.delete(upload.id).catch(() => {});
    throw error;
  }
}

// Download into a temporary file, then atomically publish it. Concurrent viewers
// share a single restore, so none can read a partially downloaded document.
async function ensureLocalFile(filePath) {
  if (fs.existsSync(filePath)) return true;
  const filename = path.basename(filePath);
  if (!validFilename(filename) || path.resolve(filePath) !== path.join(uploadsDir, filename)) return false;
  if (pending.has(filename)) return pending.get(filename);
  const restore = (async () => {
    const store = bucket();
    const file = await store.find({ filename }).sort({ uploadDate: -1 }).limit(1).next();
    if (!file) return false;
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const temporary = `${filePath}.${file._id}.restoring`;
    try {
      await pipeline(store.openDownloadStream(file._id), fs.createWriteStream(temporary));
      await fs.promises.rename(temporary, filePath);
      return true;
    } finally { await fs.promises.unlink(temporary).catch(() => {}); }
  })();
  pending.set(filename, restore);
  try { return await restore; } finally { pending.delete(filename); }
}

async function backupLocalUploads() {
  const store = bucket();
  for (const entry of await fs.promises.readdir(uploadsDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.endsWith(".restoring")) continue;
    if (!await store.find({ filename: entry.name }).limit(1).next()) {
      await persistFile(path.join(uploadsDir, entry.name), entry.name);
    }
  }
}

module.exports = { persistFile, ensureLocalFile, backupLocalUploads, validFilename, bucket };
