import api from "./api";

export const loadTeacherHome = () => import("../components/TeacherHomeDashboard");
export const loadCourseHome = () => import("../pages/CourseListPage");

// Start the small home-screen bundle and its read concurrently, before routing
// finishes. The API adapter coalesces the page's identical request.
export function prepareHome(user) {
  if (!localStorage.getItem("token")) return;
  if (user?.role === "teacher") {
    Promise.allSettled([loadTeacherHome(), api.get("/courses/teacher-summary")]);
  } else if (user?.role === "student") {
    Promise.allSettled([loadCourseHome(), api.get("/courses/my")]);
  }
}
