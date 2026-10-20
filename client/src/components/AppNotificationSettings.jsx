import { useEffect, useState } from "react";
import { openNotificationSettings } from "../services/nativeFiles";
import { getCallSettings, openCallSettings } from "../services/callBridge";
import { FiBell, FiCheckCircle, FiInfo, FiSmartphone, FiPhone, FiRefreshCw, FiSend } from "react-icons/fi";
import { SettingsCard } from "./SettingsPrimitives";
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
    <SettingsCard title="Phone alerts" description="Messages, calls and academic updates on this device." icon={FiBell}>
      <div className="settings-status" role="status">{status.registered && status.synced ? <FiCheckCircle aria-hidden="true" /> : <FiInfo aria-hidden="true" />}<span>{summary}</span></div>
      {status.error && <p className="settings-help" role="alert">{status.error}</p>}
      <div className="settings-notification-actions">
        <button type="button" className="settings-button settings-button-secondary" onClick={() => openNotificationSettings().catch(() => setMessage("Open your phone's Settings → Apps → UniCore → Notifications."))}><FiSmartphone aria-hidden="true" /> Notification settings</button>
        <button type="button" className="settings-button settings-button-secondary" onClick={() => openCallSettings().catch(() => setMessage("Install the latest APK to enable the incoming-call screen."))}><FiPhone aria-hidden="true" /> Incoming calls</button>
        <button type="button" className="settings-button settings-button-primary" disabled={busy} onClick={() => run(false)}><FiRefreshCw aria-hidden="true" />
          {busy ? "Please wait…" : "Enable / reconnect"}
        </button>
        <button type="button" className="settings-button settings-button-secondary" disabled={busy || status.permission !== "granted" || !status.registered} onClick={() => run(true)}><FiSend aria-hidden="true" />
          Send test notification
        </button>
      </div>
      {message && <p className="settings-help" role="status">{message}</p>}
      {callSettings?.fullScreenAllowed === false && <p className="settings-help">Allow full-screen incoming calls in your phone settings. Android may otherwise show Answer/Decline in a notification banner.</p>}
      <details className="settings-troubleshooting"><summary>Not receiving alerts?</summary><p>Open Settings → Apps → UniCore → Notifications on your phone. Allow notifications, sound and pop-up alerts, then reconnect above.</p></details>
    </SettingsCard>
  );
}
