import { readHomeSnapshot, saveHomeSnapshot, clearHomeSnapshots } from "./homeSnapshot";
const student = { id: "student-a", role: "student" };
beforeEach(() => localStorage.clear());

test("home snapshots survive a new render but stay scoped to the signed-in account and role", () => {
  saveHomeSnapshot(student, "courses", [{ _id: "course-a" }]);
  expect(readHomeSnapshot({ ...student }, "courses")).toEqual([{ _id: "course-a" }]);
  expect(readHomeSnapshot({ id: "other", role: "student" }, "courses")).toBeNull();
  expect(readHomeSnapshot({ ...student, role: "teacher" }, "courses")).toBeNull();
  expect(readHomeSnapshot(null, "courses")).toBeNull();
});
test("expired or corrupted snapshots fall back to loading, and logout clears saved home screens", () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(1000000);
  saveHomeSnapshot(student, "courses", []);
  clock.mockReturnValue(1300001);
  expect(readHomeSnapshot(student, "courses")).toBeNull();
  saveHomeSnapshot(student, "courses", [{ _id: "new" }]);
  clearHomeSnapshots();
  expect(readHomeSnapshot(student, "courses")).toBeNull();
  localStorage.setItem("unicore_home_student-a:student:courses", "broken json");
  expect(readHomeSnapshot(student, "courses")).toBeNull();
  clock.mockRestore();
});
