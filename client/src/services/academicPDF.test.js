const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { createInvoicePDF, createTranscriptPDF, downloadInvoice, downloadTranscript } = require("./academicPDF");
import { exportPDF } from "./nativeFiles";
jest.mock("./nativeFiles", () => ({ exportPDF: jest.fn(async () => true) }));
const invoice = { studentName: "Sample Student", studentId: "123", invoiceNo: "INV-123", coursesWithFee: [{ courseCode: "CSE 111", courseTitle: "Programming", fee: 300, creditHours: 3 }], fixedFees: [{ name: "Library", amount: 100 }], grandTotal: 400, paidAmount: 400, dueAmount: 0, isPaid: true };
test("invoice exports real PDF bytes containing fees and student identity", async () => {
  const pdf = createInvoicePDF(invoice);
  const bytes = pdf.output();
  expect(bytes.startsWith("%PDF-")).toBe(true);
  expect(bytes).toContain("INV-123");
  expect(bytes).toContain("Programming");
  expect(bytes).toContain("BDT 400");
  await downloadInvoice(invoice);
  expect(exportPDF).toHaveBeenCalledWith(expect.anything(), "Invoice-INV-123.pdf");
});
test("long transcripts paginate without losing later courses and use the native PDF save path", async () => {
  const data = { studentInfo: { name: "Sample Student", studentId: "123" }, semesterBreakdown: [{ semesterName: "Term 1", semesterGPA: 3.5, courses: Array.from({ length: 100 }, (_, i) => ({ courseCode: `CSE ${i}`, courseTitle: `Course number ${i}`, creditHours: 3, letterGrade: "A", gradePoint: 3.75 })) }] };
  const pdf = createTranscriptPDF(data);
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  expect(pdf.output()).toContain("Course number 99");
  await downloadTranscript(data);
  expect(exportPDF).toHaveBeenCalledWith(expect.anything(), "Transcript-123.pdf");
});
