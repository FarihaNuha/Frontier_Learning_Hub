const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { pageSize, cursorFilter } = require("../utils/pagination");
const id = number => String(number).padStart(24, "0");
const value = item => item?.getTime ? item.getTime() : String(item?._id || item);
function matches(row, filter) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === "$and") return wanted.every(query => matches(row, query));
    if (key === "$or") return wanted.some(query => matches(row, query));
    const actual = row[key];
    if (wanted && typeof wanted === "object" && !wanted.getTime && !wanted._bsontype) {
      if ("$ne" in wanted) return ![actual].flat().some(item => value(item) === value(wanted.$ne));
      if ("$lt" in wanted) return value(actual) < value(wanted.$lt);
      if ("$lte" in wanted) return value(actual) <= value(wanted.$lte);
    }
    return actual == null && wanted == null || value(actual) === value(wanted);
  });
}
function fixture() {
  const messages = [], posts = [], limits = [], reads = [], populations = [], controls = [];
  let commentQueries = 0;
  const query = (source, filter) => {
    let rows = source.filter(row => matches(row, filter));
    return {
      populate(field, select) {
        populations.push([field, select]);
        if (field === "lecture" && select === "-fileData") rows = rows.map(row => ({ ...row, lecture: row.lecture && { _id: row.lecture._id, title: row.lecture.title } }));
        return this;
      },
      sort(fields) { rows.sort((a, b) => { for (const [field, order] of Object.entries(fields)) { const result = value(a[field]) < value(b[field]) ? -1 : value(a[field]) > value(b[field]) ? 1 : 0; if (result) return result * order; } return 0; }); return this; },
      limit(n) { limits.push(n); rows = rows.slice(0, n); return this; },
      async lean() { return rows.map(row => ({ ...row })); },
    };
  };
  const module = { exports: {} };
  const dependencies = {
    "../models/CommunityPost": { find: filter => query(posts, filter) },
    "../models/CommunityComment": { aggregate: async pipeline => { commentQueries++; return pipeline[0].$match.postId.$in.map(_id => ({ _id, count: 2 })); }, countDocuments() { throw new Error("Per-post count query is forbidden"); } },
    "../models/PrivateMessage": { find: filter => query(messages, filter), findOne: async () => null, create: async data => ({ ...data, _id: id(999), createdAt: new Date() }), updateMany: async filter => { reads.push(filter); return { modifiedCount: 0 }; } },
    "../models/User": { findById: userId => ({ select() { return this; }, async lean() { return { _id: userId, name: "Peer", role: "student", profilePicture: "large-avatar-only-once" }; }, then(done) { return this.lean().then(done); } }) },
    "../socket": { getIO: () => ({ to() { return this; }, emit() {} }) },
    "../models/Notification": { create: async () => ({ _id: id(1000), createdAt: new Date() }), updateMany: async () => ({}) },
    "../services/fcmService": { sendUserPushNotification: async (owner, payload) => { controls.push({ owner, payload }); } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../controllers/communityController.js"), "utf8"), {
    module, exports: module.exports, require: name => dependencies[name] || require(name), console, Date,
  });
  const run = async (method, query = {}, overrides = {}) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports[method]({ params: { userId: id(2) }, user: { uid: id(1), name: "Me", role: "student" }, query, ...overrides }, res);
    return res;
  };
  return { messages, posts, limits, reads, populations, controls, run, commentQueries: () => commentQueries };
}

test("chat pages stay bounded and traverse timestamp ties without duplicate or missing messages", async () => {
  const f = fixture();
  for (let i = 1; i <= 95; i++) f.messages.push({ _id: id(1000 + i), sender: i % 2 ? id(1) : id(2), receiver: i % 2 ? id(2) : id(1), content: `Message ${i}`, createdAt: new Date(1767225600000 + Math.floor(i / 3) * 1000) });
  f.messages.push({ _id: id(9999), sender: id(3), receiver: id(4), content: "Not this conversation", createdAt: new Date() });
  const seen = []; let cursor;
  do {
    const res = await f.run("getConversation", { limit: 40, ...(cursor ? { cursor } : {}) });
    assert.equal(res.statusCode, 200); assert.ok(res.body.messages.length <= 40);
    assert.ok(!JSON.stringify(res.body.messages).includes("large-avatar-only-once"));
    assert.ok(!res.body.messages.some(message => message.content === "Not this conversation"));
    seen.push(...res.body.messages.map(message => message._id)); cursor = res.body.nextCursor;
  } while (cursor);
  assert.equal(new Set(seen).size, 95); assert.equal(seen.length, 95);
  assert.ok(f.limits.every(limit => limit === 41));
  assert.equal(f.reads.length, 1, "older pages do not create extra read writes");
  assert.equal(f.reads[0].sender, id(2));
});
test("community pages exclude file binaries and use one grouped comment query", async () => {
  const f = fixture();
  for (let i = 1; i <= 60; i++) f.posts.push({ _id: id(i), courseId: null, createdAt: new Date(1767225600000 + i * 1000), lecture: { _id: id(999), title: "Slides", fileData: "large-original-file" } });
  const res = await f.run("getPublicPosts");
  assert.equal(res.body.posts.length, 20); assert.equal(res.body.hasMore, true);
  assert.ok(!JSON.stringify(res.body).includes("large-original-file"));
  assert.ok(res.body.posts.every(post => post.commentCount === 2));
  assert.equal(f.commentQueries(), 1); assert.equal(f.limits[0], 21);
});
test("invalid cursors fail before querying data, and caller-supplied limits are capped", async () => {
  const f = fixture();
  const res = await f.run("getConversation", { cursor: "invalid" });
  assert.equal(res.statusCode, 400); assert.equal(f.limits.length, 0);
  assert.equal(pageSize(1000000), 50); assert.equal(pageSize(-1), 1);
  assert.throws(() => cursorFilter(Buffer.from(JSON.stringify({ time: "invalid", id: id(1) })).toString("base64url")), /Invalid/);
});

test("an inline reply marks only that peer's earlier incoming messages read and syncs the same cutoff", async () => {
  const f = fixture(), cutoff = new Date("2026-01-01T10:00:00Z");
  const res = await f.run("sendMessage", {}, { body: { receiverId: id(2), content: "Reply" }, notificationReplyThrough: cutoff });
  assert.equal(res.statusCode, 201);
  assert.equal(f.reads.length, 1);
  assert.equal(f.reads[0].sender, id(2)); assert.equal(f.reads[0].receiver, id(1));
  assert.equal(f.reads[0].createdAt.$lte.getTime(), cutoff.getTime());
  assert.equal(f.controls[0].payload.data.timestamp, String(cutoff.getTime()));
  assert.equal(f.controls[0].payload.data.threadId, id(2));
});
