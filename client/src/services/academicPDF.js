import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { exportPDF } from "./nativeFiles";

const text = value => String(value ?? "-");
const amount = value => `BDT ${Number(value || 0).toLocaleString("en-US")}`;
function heading(pdf, title, subtitle) {
  pdf.setFontSize(15);
  const lines = pdf.splitTextToSize(title, 180);
  pdf.text(lines, 15, 18);
  const y = 22 + lines.length * 6;
  pdf.setFontSize(11);
  pdf.text(subtitle, 15, y);
  return y + 8;
}
const table = (pdf, options) => {
  autoTable(pdf, { margin: { left: 15, right: 15 }, styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2 }, headStyles: { fillColor: [27, 93, 125] }, ...options });
  return pdf.lastAutoTable.finalY + 7;
};
export function createInvoicePDF(invoice) {
  const pdf = new jsPDF();
  let y = heading(pdf, invoice.universityName || "University of Frontier Technology, Bangladesh", "Registration Invoice & Fee Statement");
  y = table(pdf, { startY: y, body: [
    ["Invoice", text(invoice.invoiceNo), "Date", text(invoice.submittedDate)],
    ["Student", text(invoice.studentName), "Student ID", text(invoice.studentId)],
    ["Level / Term", `${text(invoice.level)} ${text(invoice.term)}`, "Session", text(invoice.session)],
    ["Department", text(invoice.departmentName), "Status", invoice.isPaid ? "PAID IN FULL" : "UNPAID / DUE"]
  ] });
  y = table(pdf, { startY: y, head: [["Code", "Course", "Type", "Credit", "Fee (BDT)"]], body: (invoice.coursesWithFee || []).map(c => [text(c.courseCode), text(c.courseTitle), text(c.courseType), text(c.creditHours), text(c.fee)]) });
  y = table(pdf, { startY: y, head: [["Institutional / Administrative Fee", "Amount (BDT)"]], body: (invoice.fixedFees || []).map(f => [text(f.name), text(f.amount)]) });
  table(pdf, { startY: y, body: [
    ["Course subtotal", amount(invoice.courseSubtotal)], ["Institutional fees", amount(invoice.fixedFeesTotal)],
    ["Grand total", amount(invoice.grandTotal)], ["Paid", amount(invoice.paidAmount)], ["Due", amount(invoice.dueAmount)],
    ...(invoice.transactionId ? [["Transaction", text(invoice.transactionId)], ["Payment", `${text(invoice.paymentMethod)} / ${text(invoice.paymentDate)}`]] : [])
  ] });
  return pdf;
}
export function createTranscriptPDF(data) {
  const pdf = new jsPDF();
  const student = data.studentInfo || {};
  let y = heading(pdf, "University of Frontier Technology, Bangladesh", "Official Academic Transcript of Record");
  y = table(pdf, { startY: y, body: [
    ["Student", text(student.name), "ID", text(student.studentId)],
    ["Department", text(student.department), "Program", text(student.program)],
    ["Batch / Session", `${text(student.batch)} / ${text(student.session)}`, "Status", text(student.academicStatus)],
    ["Credits earned", text(data.totalCreditsEarned || 0), "CGPA", Number(data.cgpa || 0).toFixed(2)],
    ["Issue date", new Date(data.issueDate || Date.now()).toLocaleDateString("en-GB"), "", ""]
  ] });
  for (const semester of data.semesterBreakdown || []) {
    if (y > 255) { pdf.addPage(); y = 18; }
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(`${semester.semesterName} / ${semester.session} - GPA: ${Number(semester.semesterGPA || 0).toFixed(2)}`, 180), 15, y);
    y = table(pdf, { startY: y + 6, head: [["Code", "Course", "Type", "Credits", "Grade", "Point"]], body: (semester.courses || []).map(c => [text(c.courseCode), text(c.courseTitle), text(c.courseType), text(c.creditHours), text(c.letterGrade), c.gradePoint == null ? "-" : Number(c.gradePoint).toFixed(2)]) });
  }
  return pdf;
}
export const downloadInvoice = invoice => exportPDF(createInvoicePDF(invoice), `Invoice-${invoice.invoiceNo || invoice.studentId || "UniCore"}.pdf`);
export const downloadTranscript = data => exportPDF(createTranscriptPDF(data), `Transcript-${data.studentInfo?.studentId || "UniCore"}.pdf`);
