const XLSX = require("xlsx");

function testTemplateGeneration() {
  const wsData = [
    ["", "", "Dept: EDTE", "Session: 2022-23", "Level 3", "Term 2"],
    ["", "Course Code: ET 317", "Course Title: Blended Education Design and Development", "", "Course Type: Theory", "Credit Hour: 3"],
    [
      "SL",
      "ID of the Student",
      "Attendance and Class Performance Marks (30)",
      "Class Test/Quiz (Out of 30)",
      "Assignment (Out of 30)",
      "Presentation (Out of 30)",
      "Total CA Marks (90)",
    ],
    [1, "2202001", 30, 20, 26, 24, 70],
    [2, "2202002", 30, 25, 24, 26, 75],
    [3, "2202003", 30, 25, 26, 28, 79],
    [4, "2202022", 30, 27, 28, 24, 79],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assessment_Template");
  
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  console.log("✅ Assessment template generated successfully! Buffer length:", buffer.length);
}

testTemplateGeneration();
