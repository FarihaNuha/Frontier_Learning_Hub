// Batch the legacy registration sync lookups instead of querying once per course.
module.exports = async function approvedCourseLookup({ Course, Enrollment, approvedRegs, studentProfile, userId, studentIdStr }) {
  const queries = new Map();
  for (const reg of approvedRegs) for (const item of reg.selectedCourses || []) {
    const code = (item.courseCode || item.code || "").toUpperCase().trim();
    if (!code) continue;
    const session = reg.session || studentProfile?.session || "";
    queries.set(`${code}:${session}`, { displayCode: code, ...(session ? { session } : {}) });
  }
  if (!queries.size) return { courseFor: () => null, rememberCourse() {}, hasEnrollment: () => false };
  const [courses, enrollments] = await Promise.all([
    Course.find({ $or: [...queries.values()] }).lean(),
    Enrollment.find({ $or: [{ student: userId }, ...(studentIdStr ? [{ studentId: studentIdStr }] : [])] }).lean(),
  ]);
  const same = (a, b) => String(a ?? "") === String(b ?? "");
  return {
    courseFor: (code, session) => courses.find(course => course.displayCode === code && (!session || course.session === session)),
    rememberCourse: course => courses.push(course),
    hasEnrollment: (reg, item, course) => enrollments.some(enrollment =>
      same(enrollment.student, userId) && same(enrollment.courseCode, (item.courseCode || item.code || "").toUpperCase().trim())
      && same(enrollment.course, course._id) && same(enrollment.studentId, studentIdStr || reg.studentId)
      && same(enrollment.session, reg.session) && same(enrollment.level, reg.level) && same(enrollment.term, reg.term)
      && same(enrollment.courseTitle, item.courseTitle)),
  };
};
