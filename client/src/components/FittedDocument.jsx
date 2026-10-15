import React, { useLayoutEffect, useRef, useState } from "react";

// Keep paper/slide layout intact while fitting the available viewport width.
export default function FittedDocument({ children, width = 816, height, className = "" }) {
  const viewport = useRef(null);
  const content = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ scale: 1, width, height: height || 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (!viewport.current || !content.current) return;
      const naturalWidth = Math.max(width, content.current.scrollWidth);
      const scale = Math.min(1, viewport.current.clientWidth / naturalWidth) * zoom;
      setSize({ scale, width: naturalWidth * scale, height: (height || content.current.scrollHeight) * scale });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(content.current);
    const mutations = new MutationObserver(measure);
    mutations.observe(content.current, { childList: true, subtree: true });
    content.current.addEventListener("load", measure, true);
    measure();
    const element = content.current;
    return () => { observer.disconnect(); mutations.disconnect(); element.removeEventListener("load", measure, true); };
  }, [width, height, zoom]);
  return <div className={`fitted-document ${className}`} style={{ width: "100%", minWidth: 0 }}>
    <div className="document-zoom-controls" style={{ display: "flex", gap: 8, padding: "6px 0", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setZoom(1)}>Fit width</button>
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}>−</button>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}>+</button>
    </div>
    <div ref={viewport} style={{ width: "100%", overflow: "auto" }}>
    <div style={{ width: size.width, height: size.height, position: "relative", overflow: "hidden" }}>
      <div ref={content} style={{ width, height, transform: `scale(${size.scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>{children}</div>
    </div>
    </div>
  </div>;
}
