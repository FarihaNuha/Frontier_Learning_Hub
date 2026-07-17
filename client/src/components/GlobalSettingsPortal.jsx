import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSettings } from "react-icons/fi";

export default function GlobalSettingsPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarNavEl, setSidebarNavEl] = useState(null);

  useEffect(() => {
    const findNav = () => {
      const el = document.querySelector(".sidebar-nav");
      if (el) {
        let portalContainer = el.querySelector("#sidebar-settings-portal");
        if (!portalContainer) {
          portalContainer = document.createElement("div");
          portalContainer.id = "sidebar-settings-portal";
          portalContainer.style.width = "100%";
          
          const logoutBtn = el.querySelector(".logout-btn");
          if (logoutBtn) {
            el.insertBefore(portalContainer, logoutBtn);
          } else {
            el.appendChild(portalContainer);
          }
        }
        setSidebarNavEl(portalContainer);
      } else {
        setSidebarNavEl(null);
      }
    };

    findNav();

    const observer = new MutationObserver(findNav);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!sidebarNavEl) return null;

  const isActive = location.pathname === "/settings";

  return createPortal(
    <button
      className={`nav-item ${isActive ? "active" : ""}`}
      onClick={() => navigate("/settings")}
    >
      <FiSettings size={18} />
      <span>Settings</span>
    </button>,
    sidebarNavEl
  );
}
