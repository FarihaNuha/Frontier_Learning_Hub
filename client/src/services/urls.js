import { Capacitor } from "@capacitor/core";
import { BACKEND_URL } from "./api";

export const PUBLIC_APP_URL = Capacitor.isNativePlatform()
  ? process.env.REACT_APP_WEB_URL || "https://frontier-learning-academy.vercel.app"
  : window.location.origin;

export const absoluteFileUrl = (value) => {
  if (!value) return "";
  if (/^https?:/i.test(value)) {
    const parsed = new URL(value);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname) && parsed.pathname.startsWith("/uploads/")) {
      return new URL(parsed.pathname + parsed.search, BACKEND_URL).href;
    }
    return value;
  }
  if (/^(blob:|data:)/i.test(value)) return value;
  return new URL(value.startsWith("/") ? value : `/${value}`, BACKEND_URL).href;
};
