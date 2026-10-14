import { Capacitor, registerPlugin } from "@capacitor/core";
import toast from "react-hot-toast";
import { BACKEND_URL } from "./api";

const Files = registerPlugin("UniCoreFiles");
const native = () => Capacitor.isNativePlatform();
const mimeTypes = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", csv: "text/csv", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", mp4: "video/mp4", mp3: "audio/mpeg" };
export const cleanFileName = (name = "document") => String(name).replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(0, 180) || "document";

const base64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(new Error("Could not read this file."));
  reader.readAsDataURL(blob);
});

const payload = async ({ url, blob, fileName = "document", mimeType }) => {
  if (!Capacitor.isPluginAvailable("UniCoreFiles")) throw new Error("Install the updated UniCore Android app to save or share files.");
  const name = cleanFileName(fileName);
  const type = mimeType || blob?.type || mimeTypes[name.split(".").pop()?.toLowerCase()] || "application/octet-stream";
  if (blob || /^(blob:|data:)/.test(url || "")) {
    const data = blob || await (await fetch(url)).blob();
    return { fileName: name, mimeType: type, data: await base64(data) };
  }
  const location = new URL(url, BACKEND_URL);
  const backend = new URL(BACKEND_URL);
  return { fileName: name, mimeType: type, url: location.href,
    ...(location.origin === backend.origin ? { token: localStorage.getItem("token") } : {}) };
};

export const saveFile = async (options) => {
  if (native()) return Files.saveFile(await payload(options));
  const link = document.createElement("a");
  const objectUrl = options.blob ? URL.createObjectURL(options.blob) : null;
  link.href = objectUrl || new URL(options.url, BACKEND_URL).href;
  link.download = cleanFileName(options.fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  return { cancelled: false };
};

export const downloadFile = async (options) => {
  const progress = toast.loading(native() ? "Choose where to save the file…" : "Preparing download…");
  try {
    const result = await saveFile(options);
    if (!result.cancelled) toast.success(native() ? "File saved" : "Download started");
    return !result.cancelled;
  } catch (error) {
    toast.error(error.message || "Could not save the file. Please try again.");
    return false;
  } finally { toast.dismiss(progress); }
};

export const shareFile = async (options) => {
  if (native()) return Files.shareFile(await payload(options));
  let blob = options.blob;
  if (!blob) {
    const response = await fetch(options.url);
    if (!response.ok) throw new Error("Could not prepare this file for sharing.");
    blob = await response.blob();
  }
  const file = new File([blob], cleanFileName(options.fileName), { type: blob.type });
  if (!navigator.canShare?.({ files: [file] })) throw new Error("File sharing is unavailable. Save the file instead.");
  await navigator.share({ files: [file], title: options.title });
};

export const shareText = async ({ title, text, url }) => {
  if (native()) return Files.shareText({ title, text: [text, url].filter(Boolean).join("\n\n") });
  await navigator.share({ title, text, url });
};

export const openFile = async (options) => {
  try {
    if (native()) await Files.openFile(await payload(options));
    else window.open(options.url, "_blank", "noopener,noreferrer");
  } catch (error) { toast.error(error.message || "Could not open this file. Save it instead."); }
};

export const exportWorkbook = async (XLSX, workbook, fileName) => {
  try {
    if (!native()) { XLSX.writeFile(workbook, fileName); return true; }
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return downloadFile({ blob: new Blob([data], { type: mimeTypes.xlsx }), fileName });
  } catch (error) { toast.error("Could not export the spreadsheet."); return false; }
};

export const exportPDF = async (pdf, fileName) => {
  if (!native()) { pdf.save(fileName); toast.success("Download started"); return true; }
  return downloadFile({ blob: pdf.output("blob"), fileName, mimeType: mimeTypes.pdf });
};

export const printPage = () => {
  if (!native()) { window.print(); return; }
  Files.printPage().catch(() => toast.error("Could not open printing on this phone."));
};

export const openNotificationSettings = () => Files.notificationSettings();

let downloadsInstalled = false;
export const installNativeDownloads = () => {
  if (!native() || downloadsInstalled) return;
  downloadsInstalled = true;
  document.addEventListener("click", (event) => {
    const anchor = event.target?.closest?.("a[download]");
    if (!anchor?.href) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    let name = anchor.getAttribute("download");
    if (!name) {
      try { name = decodeURIComponent(new URL(anchor.href).pathname.split("/").pop()) || "document"; }
      catch { name = "document"; }
    }
    downloadFile({ url: anchor.getAttribute("href"), fileName: name });
  }, true);
};
