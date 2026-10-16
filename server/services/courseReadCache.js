// Only used after authentication/role checks. Never cache live exams or messages.
function createCourseReadCache({ now = Date.now, ttl = 20000 } = {}) {
  const entries = new Map(), pending = new Map();
  let generation = 0, totalBytes = 0;
  const clear = () => { generation++; entries.clear(); totalBytes = 0; pending.clear(); };
  const invalidateOnWrite = (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)
        && !/\/auth\/(fcm-token|push-test|login)|\/community\/(messages|conversation)|\/notifications/.test(req.originalUrl || req.url)) {
      res.once("finish", () => { if (res.statusCode < 400) clear(); });
    }
    next();
  };
  const middleware = async (req, res, next) => {
    const uid = req.user?.uid || req.user?.id || req.user?._id;
    if (!uid) return next();
    const key = `${uid}:${req.user.role}:${req.originalUrl || req.url}`;
    const cached = entries.get(key);
    if (cached && now() < cached.until) { res.setHeader("X-App-Cache", "HIT"); return res.json(JSON.parse(cached.body)); }
    if (pending.has(key)) {
      const epoch = generation, result = await pending.get(key);
      if (result && epoch === generation) { res.setHeader("X-App-Cache", "COALESCED"); return res.json(JSON.parse(result)); }
    }
    const epoch = generation;
    let settle;
    const promise = new Promise(resolve => { settle = resolve; });
    pending.set(key, promise);
    const finish = result => { if (pending.get(key) === promise) pending.delete(key); settle(result); };
    res.once("close", () => finish(null));
    const json = res.json;
    res.json = function(data) {
      let result = null;
      if (this.statusCode === 200 && epoch === generation) {
        const body = JSON.stringify(data);
        if (body.length < 1000000) {
          if (entries.has(key)) { totalBytes -= entries.get(key).body.length; entries.delete(key); }
          while (entries.size >= 40 || totalBytes + body.length > 4000000) {
            const oldest = entries.keys().next().value; if (oldest === undefined) break;
            totalBytes -= entries.get(oldest).body.length; entries.delete(oldest);
          }
          entries.set(key, { body, until: now() + ttl }); totalBytes += body.length; result = body;
        }
      }
      finish(result);
      this.setHeader("X-App-Cache", "MISS");
      return json.call(this, data);
    };
    return next();
  };
  return { middleware, invalidateOnWrite, clear };
}
const shared = createCourseReadCache();
module.exports = { ...shared, createCourseReadCache };
