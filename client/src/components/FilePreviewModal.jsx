import SkeletonLoader from "./SkeletonLoader";
import { renderWordPreview } from "../services/wordPreview";
import FittedDocument from "./FittedDocument";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { FiX, FiDownload, FiFile, FiEye } from "react-icons/fi";
import { Capacitor } from "@capacitor/core";
import { absoluteFileUrl } from "../services/urls";
import { openFile } from "../services/nativeFiles";

export default function FilePreviewModal({ isOpen, onClose, file }) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fileCategory, setFileCategory] = useState("other");
  const [docxBuffer, setDocxBuffer] = useState(null);
  const [pptxSlides, setPptxSlides] = useState([]);
  const docxRef = useRef(null);

  const getAbsoluteFileUrl = absoluteFileUrl;

  useEffect(() => {
    if (!file || !isOpen) {
      setBlobUrl("");
      setTextContent("");
      setDocxBuffer(null);
      setPptxSlides([]);
      return;
    }

    const name = file.name || file.fileName || file.title || "File";
    const type = file.fileType || "";
    const ext = name.split(".").pop().toLowerCase();

    let category = "other";
    if (type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      category = "image";
    } else if (type.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(ext)) {
      category = "video";
    } else if (type.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) {
      category = "audio";
    } else if (type.includes("pdf") || ext === "pdf") {
      category = "pdf";
    } else if (type.includes("word") || type.includes("docx") || ext === "docx" || ext === "doc") {
      category = "docx";
    } else if (type.includes("powerpoint") || type.includes("presentation") || ext === "pptx" || ext === "ppt") {
      category = "pptx";
    } else if (type.includes("text") || ext === "txt") {
      category = "txt";
    }
    setFileCategory(category);

    let active = true;
    let objectUrl;
    const controller = new AbortController();
    setLoadError("");
    setDocxBuffer(null);
    const loadContent = async () => {
      setLoading(true);
      try {
        const rawFileUrl = file.url || file.fileUrl || file.fileURL;
        if (!rawFileUrl) throw new Error("No file URL");
        const fullFileUrl = getAbsoluteFileUrl(rawFileUrl);

        if (category === "pdf") {
          // Native browser PDF viewer renders directly via full URL
          setLoading(false);
          return;
        }

        const res = await fetch(fullFileUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(res.status === 404 ? "This file is no longer available. Please ask the uploader to upload it again." : "Could not load this file. Please try again.");
        const blob = await res.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);

        if (category === "docx") {
          const buffer = await blob.arrayBuffer();
          setDocxBuffer(buffer);
        } else if (category === "pptx") {
          try {
            const buffer = await blob.arrayBuffer();
            const { default: JSZip } = await import("jszip");
            const zip = await JSZip.loadAsync(buffer);
            const slideFiles = Object.keys(zip.files).filter((name) => {
              const n = name.toLowerCase();
              return (
                (n.startsWith("ppt/slides/slide") || n.includes("/slides/slide") || n.includes("slides/slide")) &&
                n.endsWith(".xml") &&
                !n.includes("_rels") &&
                !n.includes("slidelayout") &&
                !n.includes("slidemaster")
              );
            });

            slideFiles.sort((a, b) => {
              const numA = parseInt((a.match(/slide(\d+)\.xml$/i) || a.match(/(\d+)\.xml$/i) || [])[1] || "0", 10);
              const numB = parseInt((b.match(/slide(\d+)\.xml$/i) || b.match(/(\d+)\.xml$/i) || [])[1] || "0", 10);
              return numA - numB;
            });

            const parsedSlides = [];
            for (let i = 0; i < slideFiles.length; i++) {
              const slideXmlText = await zip.files[slideFiles[i]].async("text");
              const tMatches = slideXmlText.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
              const textLines = tMatches
                .map((m) => m.replace(/<[^>]+>/g, "").trim())
                .filter(Boolean);

              parsedSlides.push({
                slideNum: i + 1,
                text: textLines.join("\n") || "[Slide Content]"
              });
            }
            setPptxSlides(parsedSlides);
          } catch (err) {
            console.error("PPTX client parse error:", err);
          }
        } else if (category === "txt") {
          const text = await blob.text();
          setTextContent(text);
        }
      } catch (err) {
        if (active && err.name !== "AbortError") setLoadError(err.message || "Could not load this file.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, isOpen]);

  useEffect(() => {
    if (fileCategory === "docx" && docxBuffer && docxRef.current) {
      return renderWordPreview(docxBuffer, docxRef.current, () => setLoadError("Could not preview this document. Download it to open in a document viewer."));
    }
  }, [docxBuffer, fileCategory, loading]);

  if (!isOpen || !file) return null;

  const fileName = file.name || file.fileName || file.title || "File Preview";
  const rawDownloadUrl = file.url || file.fileUrl || file.fileURL || "";
  const downloadUrl = getAbsoluteFileUrl(rawDownloadUrl);

  const modalContent = (
    <div
      className="file-preview-portal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999999,
        padding: "16px",
        boxSizing: "border-box"
      }}
    >
      <div
        className="file-preview-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          boxSizing: "border-box",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#E8F4FD"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fileName}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            style={{
              background: "#e2e8f0",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FiX size={18} color="#475569" />
          </button>
        </div>

        {/* Body */}
        <div
          className="file-preview-body"
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
            minWidth: 0,
            alignSelf: "stretch",
            background: "#fafafa"
          }}
        >
          {loading ? (
            <SkeletonLoader type="section" />
          ) : loadError ? (
            <p role="alert" style={{ padding: 20, color: "#b91c1c" }}>{loadError}</p>
          ) : fileCategory === "pdf" ? (
            Capacitor.isNativePlatform() ? <div style={{ textAlign: "center", padding: 24 }}>
              <p>Open this PDF with a document viewer on your phone.</p>
              <button className="btn-primary" onClick={() => openFile({ url: downloadUrl, fileName, mimeType: "application/pdf" })}>Open PDF</button>
            </div> : <iframe
              src={`${downloadUrl}#toolbar=1`}
              title={fileName}
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: "10px", background: "#ffffff" }}
            />
          ) : fileCategory === "image" ? (
            <img src={blobUrl || downloadUrl} alt={fileName} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          ) : fileCategory === "video" ? (
            <video src={blobUrl || downloadUrl} controls style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "10px" }} />
          ) : fileCategory === "audio" ? (
            <audio src={blobUrl || downloadUrl} controls style={{ width: "100%" }} />
          ) : fileCategory === "docx" ? (
            <FittedDocument><div ref={docxRef} style={{ width: "100%", background: "#ffffff" }} /></FittedDocument>
          ) : fileCategory === "pptx" ? (
            <div style={{ width: "100%", maxHeight: "70vh", overflowY: "auto", padding: "12px", background: "#ffffff", borderRadius: "10px" }}>
              <h4 style={{ margin: "0 0 16px", color: "#2c4b66", fontSize: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Presentation Slides ({pptxSlides.length})</span>
                {downloadUrl && !downloadUrl.includes("localhost") && !downloadUrl.includes("127.0.0.1") && (
                  <a href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(downloadUrl)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#0284c7" }}>
                    View in Office Web
                  </a>
                )}
              </h4>
              {pptxSlides.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px" }}>
                  <p style={{ color: "#64748b", fontWeight: 500 }}>No readable text extracted from slides.</p>
                  <a href={downloadUrl} download={fileName} className="btn-primary" style={{ display: "inline-block", marginTop: "10px", padding: "8px 16px" }}>
                    Download PPTX File
                  </a>
                </div>
              ) : (
                pptxSlides.map((slide, idx) => (
                  <div key={idx} style={{ background: "#E8F4FD", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <h5 style={{ color: "#0284c7", margin: "0 0 10px 0", fontSize: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>Slide {slide.slideNum}</h5>
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "#334155", margin: 0, fontSize: "14px", lineHeight: "1.6" }}>
                      {slide.text}
                    </pre>
                  </div>
                ))
              )}
            </div>
          ) : fileCategory === "txt" ? (
            <pre style={{ width: "100%", maxHeight: "70vh", overflowY: "auto", background: "#ffffff", padding: "16px", borderRadius: "10px", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {textContent}
            </pre>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <FiFile size={56} color="#94a3b8" style={{ marginBottom: "12px" }} />
              <h4 style={{ margin: "0 0 6px", color: "#334155" }}>Preview not available for this file type</h4>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>Click download below to view this file on your device.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#ffffff",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px"
          }}
        >
          <a
            href={downloadUrl}
            download={fileName}
            className="btn-primary"
            style={{
              padding: "10px 20px",
              background: "#3b8db3",
              color: "#ffffff",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FiDownload size={16} />
            <span>Download File</span>
          </a>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
