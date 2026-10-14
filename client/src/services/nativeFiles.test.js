jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: jest.fn(() => true), isPluginAvailable: jest.fn(() => true) },
  registerPlugin: jest.fn(() => ({ saveFile: jest.fn(async () => ({ cancelled: false })), shareFile: jest.fn(async () => {}) })),
}));
jest.mock("./api", () => ({ BACKEND_URL: "https://frontier-learning-academy.onrender.com" }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { loading: jest.fn(() => "progress"), success: jest.fn(), error: jest.fn(), dismiss: jest.fn() } }));

let files, plugin, capacitor, toast;
beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
  files = require("./nativeFiles");
  const core = require("@capacitor/core");
  capacitor = core.Capacitor;
  plugin = core.registerPlugin.mock.results[0].value;
  toast = require("react-hot-toast").default;
});

test("protected downloads use the cloud backend and the signed-in user's authorization", async () => {
  localStorage.setItem("token", "session-token");
  await files.saveFile({ url: "/api/lectures/download/123", fileName: "Lecture.pdf" });
  expect(plugin.saveFile).toHaveBeenCalledWith(expect.objectContaining({
    url: "https://frontier-learning-academy.onrender.com/api/lectures/download/123",
    token: "session-token", mimeType: "application/pdf",
  }));
});

test("authorization is never attached to another host", async () => {
  localStorage.setItem("token", "private-token");
  await files.saveFile({ url: "https://example.org/file.pdf", fileName: "Lecture.pdf" });
  expect(plugin.saveFile.mock.calls[0][0].token).toBeUndefined();
});

test("cancelling the Android file picker does not claim the file was saved", async () => {
  plugin.saveFile.mockResolvedValue({ cancelled: true });
  expect(await files.downloadFile({ url: "/uploads/lecture.pdf", fileName: "Lecture.pdf" })).toBe(false);
  expect(toast.success).not.toHaveBeenCalled();
});

test("generated spreadsheets go through the native save flow as real file bytes", async () => {
  const XLSX = { write: jest.fn(() => new Uint8Array([65, 66, 67])), writeFile: jest.fn() };
  await files.exportWorkbook(XLSX, {}, "Attendance.xlsx");
  expect(XLSX.writeFile).not.toHaveBeenCalled();
  expect(plugin.saveFile.mock.calls[0][0]).toMatchObject({ data: "QUJD", fileName: "Attendance.xlsx" });
});

test("web spreadsheet export keeps the browser download behavior", async () => {
  capacitor.isNativePlatform.mockReturnValue(false);
  const XLSX = { writeFile: jest.fn(), write: jest.fn() };
  await files.exportWorkbook(XLSX, {}, "Students.xlsx");
  expect(XLSX.writeFile).toHaveBeenCalledWith({}, "Students.xlsx");
  expect(plugin.saveFile).not.toHaveBeenCalled();
});

test("older APKs get an actionable error instead of a false download success", async () => {
  capacitor.isPluginAvailable.mockReturnValue(false);
  expect(await files.downloadFile({ url: "/uploads/file.pdf", fileName: "File.pdf" })).toBe(false);
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/updated UniCore Android app/));
  expect(plugin.saveFile).not.toHaveBeenCalled();
});
