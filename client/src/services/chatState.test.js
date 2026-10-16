import { mergeMessages } from "./chatState";
test("socket confirmation replaces the pending bubble and HTTP acknowledgement stays deduplicated", () => {
  const pending = { _id: "pending:request", clientMessageId: "request", sender: "me", content: "Hello", delivery: "sending", createdAt: "2026-01-01T00:00:00Z" };
  const saved = { ...pending, _id: "server-id", delivery: undefined };
  const socket = mergeMessages([pending], [saved]);
  const acknowledged = mergeMessages(socket, [saved]);
  expect(acknowledged).toHaveLength(1);
  expect(acknowledged[0]).toMatchObject({ _id: "server-id", delivery: undefined });
  const otherSender = mergeMessages([pending], [{ ...saved, _id: "other", sender: "friend" }]);
  expect(otherSender).toHaveLength(2);
});

test('saved recent messages survive a new process, preserve history paging and are removed on logout', () => {
  const { rememberConversation, clearConversations } = require('./chatState');
  clearConversations();
  const messages = Array.from({ length: 120 }, (_, i) => ({ _id: String(i).padStart(24, '0'), content: `message ${i}`, createdAt: new Date(1700000000000 + i * 1000).toISOString() }));
  rememberConversation('owner', 'peer', { user: { _id: 'peer' }, messages, hasMore: false, nextCursor: null });
  jest.isolateModules(() => {
    const { cachedConversation } = require('./chatState');
    const snapshot = cachedConversation('owner', 'peer');
    expect(snapshot.messages).toHaveLength(100);
    expect(snapshot.messages[0].content).toBe('message 20');
    expect(snapshot.hasMore).toBe(true);
    const cursor = JSON.parse(atob(snapshot.nextCursor.replace(/-/g, '+').replace(/_/g, '/')));
    expect(cursor).toEqual({ time: messages[20].createdAt, id: messages[20]._id });
    expect(cachedConversation('other', 'peer')).toBeUndefined();
  });
  clearConversations();
  jest.isolateModules(() => expect(require('./chatState').cachedConversation('owner', 'peer')).toBeUndefined());
});
