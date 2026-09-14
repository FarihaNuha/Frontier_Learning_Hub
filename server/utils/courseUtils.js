/**
 * Utility to resolve clean course code (e.g. CSE 113, PROG 101, ET 117)
 * instead of returning generic "COURSE".
 */
const resolveCourseCode = (title, existingDisplayCode, courseImports = []) => {
  if (existingDisplayCode && existingDisplayCode.trim().toUpperCase() !== "COURSE") {
    return existingDisplayCode.trim().toUpperCase();
  }

  const rawTitle = (title || "").trim();
  if (!rawTitle) return "COURSE";

  // Check if title itself contains/starts with a course code (e.g. "ET 117 Instructional Design" or "CC 483")
  const codeInTitle = rawTitle.match(/^([A-Z]{2,6}\s*\d{3}[A-Z]?)/i);
  if (codeInTitle) {
    return codeInTitle[1].toUpperCase();
  }

  // Clean title by removing trailing " Theory", " Lab", " Course", etc.
  const cleanedTitle = rawTitle
    .replace(/\s+Theory(\s+Sessional)?$/i, (match, p1) => (p1 ? " Sessional" : ""))
    .replace(/\s+Lab$/i, " Sessional")
    .replace(/\s+Course$/i, "")
    .trim();

  // 1. Try exact match on cleanedTitle
  let match = Array.isArray(courseImports)
    ? courseImports.find(
        (ci) => ci.courseTitle && ci.courseTitle.trim().toLowerCase() === cleanedTitle.toLowerCase()
      )
    : null;

  // 2. Try exact match on rawTitle
  if (!match && Array.isArray(courseImports)) {
    match = courseImports.find(
      (ci) => ci.courseTitle && ci.courseTitle.trim().toLowerCase() === rawTitle.toLowerCase()
    );
  }

  // 3. Try partial inclusion match
  if (!match && Array.isArray(courseImports)) {
    match = courseImports.find(
      (ci) =>
        ci.courseTitle &&
        (ci.courseTitle.toLowerCase().includes(cleanedTitle.toLowerCase()) ||
          cleanedTitle.toLowerCase().includes(ci.courseTitle.toLowerCase()))
    );
  }

  if (match?.courseCode) {
    return match.courseCode.toUpperCase();
  }

  return existingDisplayCode && existingDisplayCode.trim().toUpperCase() !== "COURSE"
    ? existingDisplayCode.trim().toUpperCase()
    : "COURSE";
};

module.exports = { resolveCourseCode };
