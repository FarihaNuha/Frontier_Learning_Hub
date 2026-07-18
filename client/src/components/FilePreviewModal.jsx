import React, { useState, useEffect, useRef } from "react";
import { FiX, FiDownload, FiFile, FiEye } from "react-icons/fi";
import * as docx from "docx-preview";

export default function FilePreviewModal({ isOpen, onClose, file }) {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fileCategory, setFileCategory] = useState("other");
  const [docxBuffer, setDocxBuffer] = useState(null);
  const docxRef = useRef(null);

  useEffect(() => {
    if (!file || !isOpen) {
      setBlobUrl("");
      setTextContent("");
      setDocxBuffer(null);
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
    } else if (type.includes("text") || ext === "txt") {
      category = "txt";
    }
    setFileCategory(category);

    const loadContent = async () => {
      setLoading(true);
      try {
        const fileUrl = file.url || file.fileUrl || file.fileURL;
        if (!fileUrl) throw new Error("No file URL");

        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);

        if (category === "docx") {
          const buffer = await blob.arrayBuffer();
          setDocxBuffer(buffer);
        } else if (category === "txt") {
          const text = await blob.text();
          setTextContent(text);
        }
      } catch (err) {
        console.error("Preview load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file, isOpen]);

  // Render docx asynchronously once docxRef is mounted in the DOM
  useEffect(() => {
    if (fileCategory === "docx" && docxBuffer && docxRef.current) {
      docxRef.current.innerHTML = "";
      docx.renderAsync(docxBuffer, docxRef.current, null, {
        className: "docx-preview",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      }).catch((err) => console.error("Docx renderAsync error:", err));
    }
  }, [docxBuffer, fileCategory, loading]);

  if (!isOpen || !file) return null;

  const fileName = file.name || file.fileName || file.title || "File Preview";
  const downloadUrl = file.url || file.fileUrl || file.fileURL;

  return (
    <div
      className="share-modal-overlay"
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
        zIndex: 999999,
        padding: "16px",
        boxSizing: "border-box"
      }}
    >
      <div
        className="share-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
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
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
            <FiEye size={20} color="#3b8db3" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fileName}
            </h3>
          </div>
          <button
            onClick={onClose}
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
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "350px",
            background: "#fafafa"
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", color: "#64748b" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
              <p style={{ fontWeight: 600 }}>Loading preview...</p>
            </div>
          ) : fileCategory === "pdf" ? (
            <embed src={blobUrl || downloadUrl} type="application/pdf" style={{ width: "100%", height: "70vh", borderRadius: "10px" }} />
          ) : fileCategory === "image" ? (
            <img src={blobUrl || downloadUrl} alt={fileName} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          ) : fileCategory === "video" ? (
            <video src={blobUrl || downloadUrl} controls style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "10px" }} />
          ) : fileCategory === "audio" ? (
            <audio src={blobUrl || downloadUrl} controls style={{ width: "100%" }} />
          ) : fileCategory === "docx" ? (
            <div ref={docxRef} style={{ width: "100%", maxHeight: "70vh", overflowY: "auto", background: "#ffffff", padding: "20px", borderRadius: "10px" }} />
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
}
