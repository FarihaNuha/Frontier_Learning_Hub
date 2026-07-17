import React from "react";

export default function SkeletonLoader({ type = "page" }) {
  const shimmerStyle = `
    @keyframes skeleton-shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    .skeleton-box {
      background: linear-gradient(90deg, #e2e8f0 0px, #f1f5f9 40px, #e2e8f0 80px);
      background-size: 200px 100%;
      animation: skeleton-shimmer 1.5s infinite ease-in-out;
      border-radius: 8px;
    }
  `;

  if (type === "card") {
    return (
      <div style={{ padding: "16px", borderRadius: "12px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <style>{shimmerStyle}</style>
        <div className="skeleton-box" style={{ height: "24px", width: "60%", marginBottom: "12px" }}></div>
        <div className="skeleton-box" style={{ height: "16px", width: "90%", marginBottom: "8px" }}></div>
        <div className="skeleton-box" style={{ height: "16px", width: "40%" }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px", display: "flex", gap: "24px" }}>
      <style>{shimmerStyle}</style>
      {/* Sidebar skeleton */}
      <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="skeleton-box" style={{ height: "60px", width: "100%" }}></div>
        <div className="skeleton-box" style={{ height: "120px", width: "100%" }}></div>
        <div className="skeleton-box" style={{ height: "40px", width: "100%" }}></div>
        <div className="skeleton-box" style={{ height: "40px", width: "100%" }}></div>
        <div className="skeleton-box" style={{ height: "40px", width: "100%" }}></div>
      </div>
      {/* Main content skeleton */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="skeleton-box" style={{ height: "48px", width: "40%" }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <div className="skeleton-box" style={{ height: "160px" }}></div>
          <div className="skeleton-box" style={{ height: "160px" }}></div>
          <div className="skeleton-box" style={{ height: "160px" }}></div>
        </div>
        <div className="skeleton-box" style={{ height: "240px", width: "100%" }}></div>
      </div>
    </div>
  );
}
