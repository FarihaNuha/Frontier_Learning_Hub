import { Capacitor } from "@capacitor/core";
import { BACKEND_URL } from "./api";

export const PUBLIC_APP_URL = Capacitor.isNativePlatform()
  ? process.env.REACT_APP_WEB_URL || "https://frontier-learning-academy.vercel.app"
  : window.location.origin;

export const absoluteFileUrl = (value) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value.startsWith("/") ? value : `/${value}`, BACKEND_URL).href;
};
