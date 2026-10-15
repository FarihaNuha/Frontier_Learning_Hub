import { render, screen, waitFor } from "@testing-library/react";
import FilePreviewModal from "./FilePreviewModal";
jest.mock("../services/urls", () => ({ absoluteFileUrl: value => `https://files.example.test${value}` }));
jest.mock("../services/nativeFiles", () => ({ openFile: jest.fn() }));
jest.mock("docx-preview", () => ({ renderAsync: jest.fn() }));

beforeEach(() => { global.fetch = jest.fn(); URL.createObjectURL = jest.fn(() => "blob:fixture"); URL.revokeObjectURL = jest.fn(); });
test("missing uploads display an actionable error instead of a blank document", async () => {
  fetch.mockResolvedValue({ ok: false, status: 404 });
  render(<FilePreviewModal isOpen onClose={() => {}} file={{ name: "Lecture.docx", url: "/uploads/missing.docx" }} />);
  expect((await screen.findByRole("alert")).textContent).toContain("upload it again");
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
test("closing a pending preview aborts its request", async () => {
  fetch.mockImplementation(() => new Promise(() => {}));
  const view = render(<FilePreviewModal isOpen onClose={() => {}} file={{ name: "Lecture.docx", url: "/uploads/sample.docx" }} />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const signal = fetch.mock.calls[0][1].signal;
  expect(signal.aborted).toBe(false);
  view.unmount();
  expect(signal.aborted).toBe(true);
});
