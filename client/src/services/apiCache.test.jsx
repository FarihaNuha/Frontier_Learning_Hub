import { act, renderHook, waitFor } from "@testing-library/react";
jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn(), peekReadCache: jest.fn(), subscribeReads: jest.fn(), readOwner: () => "me" } }));
import api from "./api";
import { useCachedFetch } from "./apiCache";
beforeEach(() => { api.peekReadCache.mockReturnValue(null); api.subscribeReads.mockReturnValue(() => {}); });
test("disabled reads do not fetch and a late prior section cannot replace the current one", async () => {
  const replies = {};
  api.get.mockImplementation(url => new Promise(resolve => { replies[url] = resolve; }));
  const view = renderHook(({ url, enabled }) => useCachedFetch(url, { enabled }), { initialProps: { url: "/courses/a", enabled: false } });
  expect(api.get).not.toHaveBeenCalled();
  view.rerender({ url: "/courses/a", enabled: true });
  view.rerender({ url: "/courses/b", enabled: true });
  await act(async () => replies["/courses/a"]({ data: { name: "A" } }));
  expect(view.result.current.data).toBeNull();
  await act(async () => replies["/courses/b"]({ data: { name: "B" } }));
  expect(view.result.current.data).toEqual({ name: "B" });
});
test("saved content renders immediately; stale responses cannot overwrite a newer background event", async () => {
  let reply, publish;
  api.peekReadCache.mockReturnValue({ name: "cached" });
  api.get.mockImplementation(() => new Promise(resolve => { reply = resolve; }));
  api.subscribeReads.mockImplementation(listener => { publish = listener; return () => {}; });
  const view = renderHook(() => useCachedFetch("/courses/a"));
  expect(view.result.current.loading).toBe(false);
  expect(view.result.current.data.name).toBe("cached");
  await act(async () => { publish({ owner: "me", url: "/courses/a", params: {}, data: { name: "fresh" } }); reply({ data: { name: "cached" } }); });
  await waitFor(() => expect(view.result.current.data.name).toBe("fresh"));
});

test("legacy section state hydrates on its first render and again after returning", () => {
  const { useReadState, hasCachedReads } = require("./apiCache");
  api.peekReadCache.mockReturnValue({ attendance: [{ _id: "saved" }] });
  const section = () => {
    const [rows] = useReadState("/attendance?courseId=c", data => data.attendance, []);
    return { rows, loading: !hasCachedReads(["/attendance?courseId=c"]) };
  };
  const first = renderHook(section);
  expect(first.result.current).toEqual({ rows: [{ _id: "saved" }], loading: false });
  first.unmount();
  const returned = renderHook(section);
  expect(returned.result.current).toEqual({ rows: [{ _id: "saved" }], loading: false });
});

test("background metadata refresh updates legacy sections and late setters cannot cross courses", () => {
  const { useReadState } = require("./apiCache");
  let publish;
  api.subscribeReads.mockImplementation(listener => { publish = listener; return () => {}; });
  api.peekReadCache.mockImplementation(url => ({ name: url.endsWith("b") ? "B" : "A" }));
  const view = renderHook(({ url }) => useReadState(url, data => data.name, ""), { initialProps: { url: "/courses/a" } });
  const oldSetter = view.result.current[1];
  view.rerender({ url: "/courses/b" });
  act(() => oldSetter("late A"));
  expect(view.result.current[0]).toBe("B");
  act(() => publish({ owner: "me", url: "/courses/b", data: { name: "Fresh B" } }));
  expect(view.result.current[0]).toBe("Fresh B");
});
