import { useLayoutEffect } from "react";

export default function useMobileDrawer(open) {
  useLayoutEffect(() => {
    if (!open || (window.matchMedia && !window.matchMedia("(max-width: 1024px)").matches)) return;
    const body = document.body;
    const y = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.classList.add("mobile-drawer-open");
    Object.assign(body.style, { position: "fixed", top: `-${y}px`, width: "100%", overflow: "hidden" });
    return () => {
      body.classList.remove("mobile-drawer-open");
      Object.assign(body.style, previous);
      window.scrollTo(0, y);
    };
  }, [open]);
}
