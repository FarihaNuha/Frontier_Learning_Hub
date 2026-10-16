import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import StudentSidebar from "./StudentSidebar";
import TeacherSidebar from "./TeacherSidebar";
import AdminSidebar from "./AdminSidebar";
import SkeletonLoader from "./SkeletonLoader";

export default function RouteSkeleton() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <SkeletonLoader />;
  const Sidebar = user.role === "teacher" ? TeacherSidebar : user.role === "student" ? StudentSidebar : AdminSidebar;
  const courseId = pathname.match(/^\/(?:course|(?:student|teacher)\/(?:assignments|exams|attendance|assessment|analytics))\/([^/]+)/)?.[1];
  const type = /messages/.test(pathname) ? "chat" : /results|attendance|assessment|transcript|registration/.test(pathname) ? "table" : /notices|community/.test(pathname) ? "list" : "section";
  return <div className="dashboard-container"><Sidebar courseId={courseId} /><main className="main-content"><SkeletonLoader type={type} /></main></div>;
}
