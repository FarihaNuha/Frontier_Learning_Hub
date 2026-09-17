const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function cleanupDuplicateNotices() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));

  const notices = await Notice.find({ deadlineDate: { $ne: null } }).sort({ updatedAt: -1 }).lean();
  console.log(`Total deadline notices before cleanup: ${notices.length}`);

  const extractDigit = (s) => { const m = String(s || "").match(/(\d+)/); return m ? m[1] : ""; };
  const normSessStr = (s) => {
    if (!s) return "";
    const str = String(s).trim();
    const match = str.match(/\d{4}[-\s]?\d{2,4}/);
    if (match) {
      const raw = match[0].replace(/\s+/g, "-");
      const parts = raw.split("-");
      if (parts.length === 2 && parts[1].length === 4) {
        return `${parts[0]}-${parts[1].substring(2)}`;
      }
      return raw;
    }
    return str.toLowerCase().replace(/\s+/g, "-");
  };

  const seenKeys = new Set();
  const toDeleteIds = [];

  notices.forEach((n) => {
    const resType = n.resultDeadlineType || "Final";
    const sess = normSessStr(n.session) || "2022-23";
    const ldig = extractDigit(n.level) || "1";
    const tdig = extractDigit(n.term) || "1";

    const key = `${resType}_${sess}_${ldig}_${tdig}`;
    if (seenKeys.has(key)) {
      toDeleteIds.push(n._id);
    } else {
      seenKeys.add(key);
    }
  });

  if (toDeleteIds.length > 0) {
    console.log(`Deleting ${toDeleteIds.length} duplicate notice(s)...`);
    await Notice.deleteMany({ _id: { $in: toDeleteIds } });
    console.log("Duplicate notices deleted successfully!");
  } else {
    console.log("No duplicate notices found.");
  }

  const finalNotices = await Notice.find({ deadlineDate: { $ne: null } }).lean();
  console.log(`Total deadline notices after cleanup: ${finalNotices.length}`);
  finalNotices.forEach(n => {
    console.log(`  - [${n.resultDeadlineType}] ${n.title} | Session: ${n.session} | Level: ${n.level} | Term: ${n.term} | Deadline: ${n.deadlineDate}`);
  });

  await mongoose.disconnect();
}

cleanupDuplicateNotices();
