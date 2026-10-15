const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), vm = require("node:vm");
const { Readable, Writable } = require("node:stream");

async function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "unicore-storage-"));
  const uploads = path.join(root, "uploads"); fs.mkdirSync(uploads);
  const files = new Map(); let restores = 0, fail = false;
  class Bucket {
    openUploadStream(filename) {
      const chunks = [], id = filename;
      const stream = new Writable({ write(chunk, enc, cb) { if (fail) return cb(new Error("storage unavailable")); chunks.push(chunk); cb(); }, final(cb) { files.set(id, { _id: id, filename, data: Buffer.concat(chunks) }); cb(); } });
      stream.id = id; return stream;
    }
    find({ filename }) { return { sort() { return this; }, limit() { return this; }, async next() { return files.get(filename); } }; }
    openDownloadStream(id) { restores++; return Readable.from(files.get(id).data); }
    async delete(id) { files.delete(id); }
  }
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../services/uploadStore.js"), "utf8"), { module, __dirname: path.join(root, "server/services"), require: name => name === "mongoose" ? { connection: { db: {} }, mongo: { GridFSBucket: Bucket } } : require(name) });
  try { await run({ store: module.exports, uploads, files, fail: () => { fail = true; }, restores: () => restores }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test("a durable upload survives loss of the server cache and concurrent viewers get identical bytes", () => fixture(async f => {
  const bytes = Buffer.alloc(17 * 1024 * 1024, 42), name = "lecture.mp4", target = path.join(f.uploads, name);
  fs.writeFileSync(target, bytes);
  await f.store.persistFile(target, name, "video/mp4");
  fs.unlinkSync(target);
  const results = await Promise.all([f.store.ensureLocalFile(target), f.store.ensureLocalFile(target)]);
  assert.ok(results.every(Boolean)); assert.equal(f.restores(), 1);
  assert.deepEqual(fs.readFileSync(target), bytes);
  assert.ok(!fs.readdirSync(f.uploads).some(n => n.endsWith(".restoring")));
}));
test("failed storage writes reject the upload and missing originals never become empty files", () => fixture(async f => {
  const target = path.join(f.uploads, "missing.pdf");
  assert.equal(await f.store.ensureLocalFile(target), false);
  assert.equal(fs.existsSync(target), false);
  fs.writeFileSync(target, "original"); f.fail();
  await assert.rejects(f.store.persistFile(target, "missing.pdf"), /storage unavailable/);
  assert.equal(f.files.size, 0);
}));
test("restore rejects traversal paths and startup backup preserves an existing upload", () => fixture(async f => {
  for (const name of ["..", ".", "../secret", "a/b", "a\\b"]) assert.equal(f.store.validFilename(name), false);
  assert.equal(await f.store.ensureLocalFile(path.join(f.uploads, "../secret")), false);
  fs.writeFileSync(path.join(f.uploads, "legacy.png"), "image bytes");
  await f.store.backupLocalUploads();
  assert.equal(f.files.get("legacy.png").data.toString(), "image bytes");
}));
