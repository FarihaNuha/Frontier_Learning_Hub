import React, { useState } from "react";
import { FiX, FiCopy, FiShare2 } from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaTwitter, FaFacebookMessenger, FaTelegram, FaInstagram, FaEnvelope } from "react-icons/fa";
import { communityApi } from "../services/communityApi";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/community.css";

export default function ShareModal({ isOpen, onClose, shareUrl, postTitle, postId, courseId, lectureId, type = "post", fileUrl }) {
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const isLecture = type === "lecture";

  // Ensure shareUrl is a clean, public-facing frontend URL
  const cleanShareUrl = (shareUrl && !shareUrl.includes("/api/lectures/"))
    ? shareUrl
    : (courseId ? `${window.location.origin}/course/${courseId}` : window.location.href);

  const getAbsoluteFileUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const backendHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? `http://${window.location.hostname}:5000`
      : window.location.origin;
    return `${backendHost}${url}`;
  };

  const fileDownloadUrl = fileUrl ? getAbsoluteFileUrl(fileUrl) : "";

  const defaultText = isLecture
    ? `Check out this lecture on UFTB Moodle: "${postTitle}"`
    : `Check out this post on UFTB Moodle: "${postTitle}"`;

  const fullShareText = fileDownloadUrl 
    ? `${defaultText}\n\n📄 Document Link: ${fileDownloadUrl}\nPage Link: ${cleanShareUrl}`
    : `${defaultText}\n\nPage Link: ${cleanShareUrl}`;

  const encodedText = encodeURIComponent(fullShareText);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <FaWhatsapp size={24} style={{ color: "#25D366" }} />,
      url: `https://api.whatsapp.com/send?text=${encodedText}`,
      bgColor: "#E8F9EE",
    },
    {
      name: "Messenger",
      icon: <FaFacebookMessenger size={24} style={{ color: "#00B2FF" }} />,
      url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(cleanShareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(cleanShareUrl)}`,
      bgColor: "#E6F6FF",
    },
    {
      name: "Facebook",
      icon: <FaFacebook size={24} style={{ color: "#1877F2" }} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanShareUrl)}`,
      bgColor: "#E8F2FF",
    },
    {
      name: "Twitter / X",
      icon: <FaTwitter size={24} style={{ color: "#1DA1F2" }} />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(cleanShareUrl)}&text=${encodeURIComponent(defaultText + (fileDownloadUrl ? `\n\n📄 Document: ${fileDownloadUrl}` : ""))}`,
      bgColor: "#E8F6FF",
    },
    {
      name: "Telegram",
      icon: <FaTelegram size={24} style={{ color: "#0088cc" }} />,
      url: `https://t.me/share/url?url=${encodeURIComponent(cleanShareUrl)}&text=${encodeURIComponent(defaultText + (fileDownloadUrl ? `\n\n📄 Document: ${fileDownloadUrl}` : ""))}`,
      bgColor: "#E8F4FD",
    },
    {
      name: "Instagram",
      icon: <FaInstagram size={24} style={{ color: "#E4405F" }} />,
      url: null,
      bgColor: "#FFE8EF",
    },
    {
      name: "Email",
      icon: <FaEnvelope size={24} style={{ color: "#EA4335" }} />,
      url: `mailto:?subject=${encodeURIComponent(defaultText)}&body=${encodedText}`,
      bgColor: "#FFEBE8",
    },
  ];

  const handleCopyLink = (message) => {
    const textToCopy = fileDownloadUrl 
      ? `📄 Document: ${fileDownloadUrl}\nPage Link: ${cleanShareUrl}`
      : cleanShareUrl;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        toast.success(typeof message === "string" ? message : "📋 Link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };

  const handleInstagramShare = () => {
    handleCopyLink("📋 Link copied! Paste it in Instagram");
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        if (fileUrl) {
          toast.loading("Preparing document for sharing...", { id: "share-prep" });
          const absoluteFileUrl = getAbsoluteFileUrl(fileUrl);
          
          const response = await fetch(absoluteFileUrl);
          const blob = await response.blob();
          
          const fileName = absoluteFileUrl.split("/").pop()?.split("?")[0] || (isLecture ? `${postTitle}.pdf` : "document.pdf");
          const file = new File([blob], fileName, { type: blob.type || "application/pdf" });
          
          const shareData = {
            files: [file],
            title: postTitle,
            text: defaultText,
          };
          
          toast.dismiss("share-prep");
          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success("Shared successfully!");
            onClose();
            return;
          }
        }
        
        // Fallback if no fileUrl or canShare fails
        toast.dismiss("share-prep");
        await navigator.share({
          title: postTitle,
          text: defaultText + (fileDownloadUrl ? `\n\n📄 Document: ${fileDownloadUrl}` : ""),
          url: shareUrl,
        });
        toast.success("Shared successfully!");
        onClose();
      } catch (err) {
        toast.dismiss("share-prep");
        if (err.name !== "AbortError") {
          toast.error("Error sharing file");
          console.error("Native share error:", err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareToFeed = async () => {
    setSharing(true);
    try {
      if (isLecture && lectureId) {
        await api.post(`/lectures/share/${lectureId}`, { caption, targetCourseId: courseId || null });
        toast.success("📢 Lecture shared to feed successfully!");
      } else {
        await communityApi.sharePost(postId, { caption, targetCourseId: courseId || null });
        toast.success("📢 Post shared to feed successfully!");
      }
      onClose();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      toast.error(`Failed to share ${isLecture ? "lecture" : "post"}`);
    } finally {
      setSharing(false);
    }
  };

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
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(6px)",
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
          maxWidth: "480px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          boxSizing: "border-box",
          margin: "auto"
        }}
      >
        <div className="share-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
            {showCaptionInput ? "Write Caption" : isLecture ? "Share Lecture" : "Share Post"}
          </h3>
          <button className="share-modal-close" onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiX size={18} color="#64748b" />
          </button>
        </div>

        <div className="share-modal-body">
          {showCaptionInput ? (
            <div className="share-caption-container">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write something about this post..."
                className="share-caption-textarea"
                rows={4}
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", boxSizing: "border-box", marginBottom: "16px" }}
              />
              <div className="share-caption-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  className="btn-primary"
                  onClick={handleShareToFeed}
                  disabled={sharing}
                  style={{ padding: "10px 20px", background: "#3b8db3", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                >
                  {sharing ? "Sharing..." : "📢 Share Now"}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowCaptionInput(false)}
                  style={{ padding: "10px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <button 
                className="share-to-feed-btn" 
                onClick={() => setShowCaptionInput(true)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#3b8db3",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  marginBottom: "16px"
                }}
              >
                <FiShare2 size={18} />
                <span>Share to Community Feed</span>
              </button>

              <div className="share-divider" style={{ textAlign: "center", margin: "16px 0", color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>
                <span>OR</span>
              </div>

              <p className="share-modal-subtitle" style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px 0" }}>
                Share this {isLecture ? "lecture" : "post"} directly to other platforms:
              </p>
              <div 
                className="share-options-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                  marginBottom: "20px"
                }}
              >
                {shareOptions.map((option) =>
                  option.name === "Instagram" ? (
                    <button
                      key={option.name}
                      className="share-option-item"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 4px",
                        borderRadius: "12px",
                        background: option.bgColor,
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "none",
                        color: "#1e293b",
                        fontSize: "12px"
                      }}
                      onClick={() => { handleInstagramShare(); onClose(); }}
                    >
                      <div className="share-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px" }}>{option.icon}</div>
                      <span>{option.name}</span>
                    </button>
                  ) : (
                    <a
                      key={option.name}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="share-option-item"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 4px",
                        borderRadius: "12px",
                        background: option.bgColor,
                        textDecoration: "none",
                        color: "#1e293b",
                        fontSize: "12px"
                      }}
                      onClick={onClose}
                    >
                      <div className="share-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px" }}>{option.icon}</div>
                      <span>{option.name}</span>
                    </a>
                  )
                )}
              </div>

              {navigator.share && (
                <button 
                  className="system-share-btn" 
                  onClick={handleSystemShare}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    marginBottom: "16px"
                  }}
                >
                  <FiShare2 size={16} />
                  <span>Share via Device Options...</span>
                </button>
              )}

              <div 
                className="share-link-copy-section"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f8fafc",
                  padding: "6px 8px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <input 
                  type="text" 
                  readOnly 
                  value={cleanShareUrl} 
                  className="share-link-input"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    padding: "6px 8px",
                    fontSize: "13px",
                    color: "#334155",
                    outline: "none",
                    textOverflow: "ellipsis"
                  }} 
                />
                <button 
                  className="share-copy-button" 
                  onClick={handleCopyLink} 
                  title="Copy Link"
                  style={{
                    background: "#3b8db3",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FiCopy size={16} />
                  <span>Copy</span>
                </button>
              </div>

              {fileUrl && (
                <div style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: "var(--pastel-blue-light, #e2eef6)",
                  border: "1px solid var(--pastel-blue-soft, #b1d4e5)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: "var(--pastel-blue-night, #1e3a5f)",
                  textAlign: "left",
                  lineHeight: "1.5"
                }}>
                  <strong>💡 Document Sharing Tip:</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    Standard browser links (WhatsApp, Messenger) share text. Once this project is deployed online on a public domain with HTTPS, WhatsApp will automatically fetch the file's metadata and render it as a rich document card (just like Google Classroom!).
                  </p>
                  {!navigator.share && (
                    <p style={{ margin: "6px 0 0", fontStyle: "italic", fontSize: "11px", color: "#475569" }}>
                      Note: Native file attachment sharing is disabled in local HTTP testing. Access via HTTPS/Ngrok to unlock the device native share dialog.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
