import { persistentReads } from './persistentReads';
const conversations = new Map();
const PREFIX = 'unicore_chat_v1:';
const chatKey = (owner, peer) => `${PREFIX}${owner}:${peer}`;
const recent = (data, limit) => {
  const messages = (data.messages || []).slice(-limit);
  if ((data.messages || []).length <= limit) return { ...data, messages };
  const first = messages[0];
  const nextCursor = btoa(JSON.stringify({ time: first.createdAt, id: String(first._id) })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { ...data, messages, hasMore: true, nextCursor };
};
export function mergeMessages(previous, incoming) {
  const result = [...previous];
  for (const message of incoming) {
    const index = result.findIndex(item => item._id === message._id || (message.clientMessageId && item.clientMessageId === message.clientMessageId && String(item.sender?._id || item.sender) === String(message.sender?._id || message.sender)));
    if (index < 0) result.push(message);
    else result[index] = { ...result[index], ...message };
  }
  return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
export const cachedConversation = (owner, peer) => {
  const key = chatKey(owner, peer);
  if (conversations.has(key)) return conversations.get(key);
  if (!owner || !peer) return undefined;
  try {
    const saved = JSON.parse(persistentReads.getItem(key) || 'null');
    if (saved && Date.now() - saved.savedAt < 7 * 86400000 && saved.savedAt <= Date.now()) { conversations.set(key, saved.data); return saved.data; }
  } catch { }
  return undefined;
};
export function rememberConversation(owner, peer, data) {
  const key = chatKey(owner, peer);
  conversations.delete(key);
  if (conversations.size >= 20) conversations.delete(conversations.keys().next().value);
  conversations.set(key, recent(data, 200));
  if (!owner || !peer) return;
  try {
    const confirmed = (data.messages || []).filter(message => !message.delivery);
    const snapshot = recent({ ...data, messages: confirmed }, 100);
    const encoded = JSON.stringify({ savedAt: Date.now(), data: snapshot });
    if (encoded.length > 500000) return;
    let items = JSON.parse(persistentReads.getItem(PREFIX + 'index') || '[]').filter(item => item.key !== key);
    let bytes = items.reduce((sum, item) => sum + item.bytes, 0);
    while (items.length >= 10 || bytes + encoded.length > 3000000) { const old = items.shift(); if (!old) break; persistentReads.removeItem(old.key); bytes -= old.bytes; }
    persistentReads.setItem(key, encoded); items.push({ key, bytes: encoded.length });
    persistentReads.setItem(PREFIX + 'index', JSON.stringify(items));
  } catch { }
}
export const clearConversations = () => {
  conversations.clear();
  for (const key of persistentReads.keys()) if (key.startsWith(PREFIX)) persistentReads.removeItem(key);
};
