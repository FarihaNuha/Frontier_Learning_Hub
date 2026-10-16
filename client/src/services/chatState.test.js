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
