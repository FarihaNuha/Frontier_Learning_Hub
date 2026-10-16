const conversations = new Map();
export function mergeMessages(previous, incoming) {
  const result = [...previous];
  for (const message of incoming) {
    const index = result.findIndex(item => item._id === message._id || (message.clientMessageId && item.clientMessageId === message.clientMessageId && String(item.sender?._id || item.sender) === String(message.sender?._id || message.sender)));
    if (index < 0) result.push(message);
    else result[index] = { ...result[index], ...message };
  }
  return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
export const cachedConversation = (owner, peer) => conversations.get(`${owner}:${peer}`);
export function rememberConversation(owner, peer, data) {
  if ((data.messages || []).length > 200) return;
  if (conversations.size >= 20) conversations.delete(conversations.keys().next().value);
  conversations.set(`${owner}:${peer}`, data);
}
export const clearConversations = () => conversations.clear();
