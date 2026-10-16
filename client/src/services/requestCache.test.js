import { createReadCache } from "./requestCache";
const response = data => ({ status: 200, data });
test("repeat section reads share one request, remain account-scoped and expire", async () => {
  let resolve, owner = "a", time = 0;
  const adapter = jest.fn(() => new Promise(done => { resolve = done; }));
  const cache = createReadCache(adapter, () => owner, () => time);
  const config = { method: "get", url: "/courses/teacher-summary" };
  const first = cache.request(config), duplicate = cache.request(config);
  expect(adapter).toHaveBeenCalledTimes(1);
  resolve(response({ count: 1 }));
  const [one] = await Promise.all([first, duplicate]);
  one.data.count = 99;
  expect((await cache.request(config)).data.count).toBe(1);
  owner = "b";
  const second = cache.request(config); resolve(response({ count: 2 })); await second;
  expect(adapter).toHaveBeenCalledTimes(2);
  time = 31000;
  const expired = cache.request(config); resolve(response({ count: 3 }));
  expect((await expired).data.count).toBe(2);
  expect(cache.peek(config).count).toBe(3);
  expect(adapter).toHaveBeenCalledTimes(3);
});
const memoryStorage = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values }; };
test("saved reads survive reopening without storing credentials or crossing accounts", async () => {
  const storage = memoryStorage(), adapter = jest.fn(async () => ({ ...response(JSON.stringify({ courses: ["one"] })), headers: { Authorization: "secret-token" } }));
  const config = { method: "get", baseURL: "/api", url: "/courses/my" };
  await createReadCache(adapter, () => "student-a", Date.now, { storage }).request(config);
  const reloaded = createReadCache(adapter, () => "student-a", Date.now, { storage });
  expect(reloaded.peek(config)).toEqual({ courses: ["one"] });
  await reloaded.request(config); expect(adapter).toHaveBeenCalledTimes(1);
  expect([...storage.values.values()].join("")).not.toContain("secret-token");
  await createReadCache(adapter, () => "student-b", Date.now, { storage }).request(config);
  expect(adapter).toHaveBeenCalledTimes(2);
  reloaded.clear(); expect(reloaded.peek(config)).toBeNull();
});
test("FCM sync and chat reads preserve academic cache; course writes invalidate it", async () => {
  const adapter = jest.fn(async () => response({ courses: ["one"] }));
  const cache = createReadCache(adapter, () => "student-a");
  const config = { url: "/courses/my", method: "get" };
  await cache.request(config);
  await cache.request({ url: "/auth/fcm-token", method: "post" });
  await cache.request({ url: "/community/conversation/peer/read", method: "post" });
  await cache.request(config); expect(adapter).toHaveBeenCalledTimes(3);
  await cache.request({ url: "/courses/join", method: "post" });
  await cache.request(config); expect(adapter).toHaveBeenCalledTimes(5);
});
test("expired snapshots and live exam questions cannot bypass fresh requests", async () => {
  let time = 0;
  const adapter = jest.fn(async () => response({ value: time }));
  const cache = createReadCache(adapter, () => "a", () => time);
  await cache.request({ url: "/courses/my" });
  time = 16 * 60000;
  expect(cache.peek({ url: "/courses/my" })).toBeNull();
  for (let i = 0; i < 2; i++) await cache.request({ url: "/exams/1234567890abcdef12345678" });
  expect(adapter).toHaveBeenCalledTimes(3);
});
test("device cache stays within its disk budget", async () => {
  const storage = memoryStorage();
  const cache = createReadCache(async () => response({ text: "x".repeat(180000) }), () => "a", Date.now, { storage });
  for (let i = 0; i < 30; i++) await cache.request({ url: `/courses/${i}` });
  const index = JSON.parse(storage.getItem("unicore_reads_v3:index"));
  expect(index.reduce((sum, item) => sum + item.bytes, 0)).toBeLessThanOrEqual(2000000);
  expect(index.length).toBeLessThanOrEqual(50);
});
test("mutations invalidate old reads and late responses cannot repopulate stale cache", async () => {
  let resolve;
  const adapter = jest.fn(config => config.method === "post" ? Promise.resolve(response({})) : new Promise(done => { resolve = done; }));
  const cache = createReadCache(adapter, () => "a");
  const config = { method: "get", url: "/lectures?courseId=one" };
  const old = cache.request(config);
  await cache.request({ method: "post", url: "/lectures" });
  resolve(response({ lectures: ["old"] })); await old;
  const fresh = cache.request(config); resolve(response({ lectures: ["new"] }));
  expect((await fresh).data.lectures).toEqual(["new"]);
  expect(adapter).toHaveBeenCalledTimes(3);
});
test("live conversations, read receipts and binary previews always bypass cached reads", async () => {
  const adapter = jest.fn(async () => response({}));
  const cache = createReadCache(adapter, () => "a");
  for (const url of ["/community/conversation/one", "/auth/me", "/lectures/view-base64/one"]) {
    await cache.request({ method: "get", url }); await cache.request({ method: "get", url });
  }
  expect(adapter).toHaveBeenCalledTimes(6);
});

test("query-string and Axios params share the same saved section", async () => {
  const adapter = jest.fn(async () => response({ posts: [{ _id: "p1" }] }));
  const cache = createReadCache(adapter, () => "a");
  await cache.request({ url: "/community/public/posts", params: { limit: 20, category: "all" } });
  expect(cache.peek({ url: "/community/public/posts?category=all&limit=20" }).posts[0]._id).toBe("p1");
  await cache.request({ url: "/community/public/posts?limit=20&category=all" });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("metadata over the old 1 MB cutoff stays cached, including after app restart", async () => {
  const storage = memoryStorage();
  const data = { courses: [{ _id: "c", name: "Large course", teacher: { profilePicture: "x".repeat(1100000) } }] };
  const adapter = jest.fn(async () => response(JSON.stringify(data)));
  const cache = createReadCache(adapter, () => "a", Date.now, { storage });
  await cache.request({ url: "/courses/my" });
  expect(cache.has({ url: "/courses/my" })).toBe(true);
  await cache.request({ url: "/courses/my" });
  const restarted = createReadCache(adapter, () => "a", Date.now, { storage });
  expect(restarted.peek({ url: "/courses/my" }).courses[0].name).toBe("Large course");
  await restarted.request({ url: "/courses/my" });
  expect(adapter).toHaveBeenCalledTimes(1);
});
