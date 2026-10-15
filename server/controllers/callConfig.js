const { createHmac } = require("node:crypto");
exports.getCallConfig = (req, res) => {
  const iceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const urls = (process.env.TURN_URLS || "").split(",").map(s => s.trim()).filter(s => /^turns?:[^\s]+$/.test(s));
  if (urls.length && process.env.TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:${req.user.uid}`;
    iceServers.push({ urls, username, credential: createHmac("sha1", process.env.TURN_SECRET).update(username).digest("base64") });
  } else if (urls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  res.set("Cache-Control", "no-store").json({ iceServers, relayConfigured: iceServers.length > 1 });
};
