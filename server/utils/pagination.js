const mongoose = require("mongoose");
const pageSize = (value, fallback = 20) => Math.min(50, Math.max(1, Number.parseInt(value, 10) || fallback));
function cursorFilter(cursor) {
  if (!cursor) return null;
  try {
    if (typeof cursor !== "string" || cursor.length > 200) throw new Error();
    const { time, id } = JSON.parse(Buffer.from(cursor, "base64url").toString());
    const date = new Date(time);
    if (!Number.isFinite(date.getTime()) || !mongoose.isValidObjectId(id)) throw new Error();
    return { $or: [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $lt: new mongoose.Types.ObjectId(id) } }] };
  } catch { throw Object.assign(new Error("Invalid page cursor"), { status: 400 }); }
}
function pageResult(rows, limit) {
  const hasMore = rows.length > limit, items = rows.slice(0, limit), last = items.at(-1);
  return { items, hasMore, nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: String(last._id) })).toString("base64url") : null };
}
module.exports = { pageSize, cursorFilter, pageResult };
