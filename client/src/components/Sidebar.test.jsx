import { fireEvent, render, screen } from "@testing-library/react";
import StudentSidebar from "./StudentSidebar";
import TeacherSidebar from "./TeacherSidebar";
const mockNavigate = jest.fn();
beforeEach(() => { window.scrollTo = jest.fn(); });
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useParams: () => ({}) }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { name: "Fixture", role: "student" }, logout: jest.fn() }) }));
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: { course: { title: "Course" } } })) } }));

test.each([["student", StudentSidebar], ["teacher", TeacherSidebar]])("%s submenu stays open until a destination is selected", (_, Sidebar) => {
  render(<Sidebar currentPage="dashboard" />);
  fireEvent.click(screen.getByRole("button", { name: "Toggle Menu" }));
  const sidebar = document.querySelector(".sidebar");
  expect(sidebar.classList.contains("mobile-open")).toBe(true);
  const registration = screen.getByRole("button", { name: "Registration", exact: true });
  fireEvent.click(registration);
  expect(registration.getAttribute("aria-expanded")).toBe("true");
  expect(sidebar.classList.contains("mobile-open")).toBe(true);
  fireEvent.click(registration);
  expect(registration.getAttribute("aria-expanded")).toBe("false");
  expect(sidebar.classList.contains("mobile-open")).toBe(true);
  const community = screen.getByRole("button", { name: /Community/ });
  fireEvent.click(community);
  expect(sidebar.classList.contains("mobile-open")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Messages/ }));
  expect(sidebar.classList.contains("mobile-open")).toBe(false);
  expect(mockNavigate).toHaveBeenCalled();
});
