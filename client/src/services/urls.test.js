import { absoluteFileUrl } from "./urls";
jest.mock("./api", () => ({ BACKEND_URL: "https://backend.example.test" }));
test("old local upload links resolve against the shared backend on another device", () => {
  expect(absoluteFileUrl("http://localhost:5000/uploads/lecture.pdf")).toBe("https://backend.example.test/uploads/lecture.pdf");
  expect(absoluteFileUrl("/uploads/image.png")).toBe("https://backend.example.test/uploads/image.png");
  expect(absoluteFileUrl("https://cdn.example.org/file.pdf")).toBe("https://cdn.example.org/file.pdf");
  expect(absoluteFileUrl("blob:current-file")).toBe("blob:current-file");
});
