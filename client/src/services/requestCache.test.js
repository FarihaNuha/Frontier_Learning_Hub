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
  const expired = cache.request(config); resolve(response({ count: 3 })); await expired;
  expect(adapter).toHaveBeenCalledTimes(3);
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
