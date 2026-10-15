import { useEffect, useState } from "react";
import { openNotificationSettings } from "../services/nativeFiles";
import { getCallSettings, openCallSettings } from "../services/callBridge";
import {
  getNativeNotificationStatus, subscribeNativeNotificationStatus,
  enableNativeNotifications, refreshNativeNotificationStatus, testNativePushNotification,
} from "../services/nativeBridge";

export default function AppNotificationSettings() {
  const [status, setStatus] = useState(getNativeNotificationStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [callSettings, setCallSettings] = useState(null);
  useEffect(() => {
    const unsubscribe = subscribeNativeNotificationStatus(() => setStatus(getNativeNotificationStatus()));
    refreshNativeNotificationStatus().catch(() => setMessage("Could not check notifications. Check your connection and retry."));
    getCallSettings().then(setCallSettings).catch(() => {});
    return unsubscribe;
  }, []);

  if (!status.native) return null;

  const run = async (test) => {
    setBusy(true);
    setMessage("");
    try {
      if (test) setMessage(await testNativePushNotification());
      else await enableNativeNotifications();
    } catch (error) {
      setMessage(error.response?.data?.error || error.message);
    } finally {
      setStatus(getNativeNotificationStatus());
      setBusy(false);
    }
  };

  const summary = status.permission !== "granted" ? "Notifications need your permission."
    : status.serverConfigured === false ? "App notifications need to be enabled by the administrator."
    : !status.registered || !status.synced ? "This phone is not connected for app notifications yet."
    : "This phone is registered. Send a test to check delivery.";

  return (
    <section className="dashboard-card" style={{ padding: 24, borderRadius: 16 }} aria-labelledby="app-notifications-title">
      <h3 id="app-notifications-title">App notifications</h3>
      <p>Get phone alerts for messages, calls, community posts, lectures, assignments and exams.</p>
      <p role="status">{summary}</p>
      {status.error && <p role="alert">{status.error}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={() => openNotificationSettings().catch(() => setMessage("Open your phone's Settings → Apps → UniCore → Notifications."))}>Phone notification settings</button>
        <button className="btn-secondary" onClick={() => openCallSettings().catch(() => setMessage("Install the latest APK to enable the incoming-call screen."))}>Incoming call screen settings</button>
        <button className="btn-primary" disabled={busy} onClick={() => run(false)}>
          {busy ? "Please wait…" : "Enable / reconnect notifications"}
        </button>
        <button className="btn-secondary" disabled={busy || status.permission !== "granted" || !status.registered} onClick={() => run(true)}>
          Send test notification
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {callSettings?.fullScreenAllowed === false && <p>Allow full-screen incoming calls in your phone settings. Android may otherwise show Answer/Decline in a notification banner.</p>}
      <p style={{ fontSize: 13, marginTop: 16 }}>If alerts are blocked, open your phone's Settings → Apps → UniCore → Notifications and allow notifications, sound and pop-up alerts.</p>
    </section>
  );
}
