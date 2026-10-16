import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

const Native = registerPlugin("UniCoreNotifications");
export const signalLaunchReady = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try { await Native.appReady(); } catch { /* Older APKs have no launch handshake. */ }
};

// Notify Android after the ready screen has committed and had a chance to paint.
export function useLaunchReady(ready) {
  useEffect(() => {
    if (!ready) return;
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(signalLaunchReady);
    });
    return () => { cancelAnimationFrame(first); if (second) cancelAnimationFrame(second); };
  }, [ready]);
}
