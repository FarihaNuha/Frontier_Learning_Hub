import api from "./api";
export function invalidateNotificationReads(type, link = "") {
  const groups = new Set();
  if (type === "lecture_upload" || /lectureId=/.test(link)) groups.add("/lectures");
  if (type === "assignment_due" || /assignments/.test(link)) groups.add("/assignments");
  if (type === "exam_reminder" || /exams/.test(link)) groups.add("/exams");
  if (["submission_status", "marksheet_upload"].includes(type) || /results|assessment/.test(link)) {
    ["/results", "/assessments", "/academic/"].forEach(value => groups.add(value));
  }
  if (/^join_/.test(type || "")) { groups.add("/courses"); groups.add("/registration"); }
  if (type === "community_post") groups.add("/community/");
  groups.forEach(group => api.invalidateReadCache?.(group));
}
