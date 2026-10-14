import React, { useEffect, useState } from "react";

export function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => { window.removeEventListener("offline", update); window.removeEventListener("online", update); };
  }, []);
  if (!offline) return null;
  return <div role="status" style={{ position: "fixed", bottom: "env(safe-area-inset-bottom, 0px)", left: 0, right: 0, zIndex: 100000, padding: "12px 16px", background: "#7c2d12", color: "white", display: "flex", gap: 16, justifyContent: "center", alignItems: "center" }}>
    <span>You are offline. Reconnect to load updates or send changes.</span>
    <button onClick={() => { setOffline(!navigator.onLine); if (navigator.onLine) window.location.reload(); }}>Retry</button>
  </div>;
}

export class AppErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ padding: 32, maxWidth: 600, margin: "15vh auto", fontFamily: "sans-serif" }}>
      <h1>UniCore could not open this screen</h1>
      <p>Your saved work on the server is still available. Reopen the app to try again.</p>
      <button onClick={() => window.location.reload()}>Reopen UniCore</button>
    </main>;
  }
}
