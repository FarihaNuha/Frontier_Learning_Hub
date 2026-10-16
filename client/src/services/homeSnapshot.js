const PREFIX = "unicore_home_";
const MAX_AGE = 5 * 60 * 1000;
const key = (user, page) => user && (user.id || user._id) ? `${PREFIX}${user.id || user._id}:${user.role}:${page}` : null;

export function readHomeSnapshot(user, page) {
  try {
    const name = key(user, page);
    if (!name) return null;
    const entry = JSON.parse(localStorage.getItem(name) || "null");
    if (entry && Date.now() - entry.savedAt < MAX_AGE && entry.savedAt <= Date.now()) return entry.data;
  } catch { /* Missing or corrupt snapshots fall back to a normal network load. */ }
  return null;
}
export function saveHomeSnapshot(user, page, data) {
  const name = key(user, page);
  if (!name) return;
  try {
    const encoded = JSON.stringify({ savedAt: Date.now(), data });
    if (encoded.length < 500000) localStorage.setItem(name, encoded);
  } catch { /* Device storage may be full or disabled. */ }
}
export function clearHomeSnapshots() {
  try {
    Object.keys(localStorage).filter(name => name.startsWith(PREFIX)).forEach(name => localStorage.removeItem(name));
  } catch { }
}
