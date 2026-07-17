import React, { useState } from "react";
import { FiX, FiCopy, FiShare2 } from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaTwitter, FaFacebookMessenger, FaTelegram, FaInstagram, FaEnvelope } from "react-icons/fa";
import { communityApi } from "../services/communityApi";
import api from "../services/api";
import toast from "react-hot-toast";

export default function ShareModal({ isOpen, onClose, shareUrl, postTitle, postId, courseId, lectureId, type = "post", fileUrl }) {
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const isLecture = type === "lecture";

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
    ? `${defaultText}\n\n📄 Document Link: ${fileDownloadUrl}\nPage Link: ${shareUrl}`
    : `${defaultText}\n\nPage Link: ${shareUrl}`;

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
      url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`,
      bgColor: "#E6F7FF",
    },
    {
      name: "Facebook",
      icon: <FaFacebook size={24} style={{ color: "#1877F2" }} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      bgColor: "#E8F2FF",
    },
    {
      name: "Twitter / X",
      icon: <FaTwitter size={24} style={{ color: "#1DA1F2" }} />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(defaultText + (fileDownloadUrl ? `\n\n📄 Document: ${fileDownloadUrl}` : ""))}`,
      bgColor: "#E8F6FF",
    },
    {
      name: "Telegram",
      icon: <FaTelegram size={24} style={{ color: "#0088cc" }} />,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(defaultText + (fileDownloadUrl ? `\n\n📄 Document: ${fileDownloadUrl}` : ""))}`,
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
      ? `📄 Document: ${fileDownloadUrl}\nPage Link: ${shareUrl}`
      : shareUrl;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        toast.success(message || "📋 Link copied to clipboard!");
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
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>{showCaptionInput ? "Write Caption" : isLecture ? "Share Lecture" : "Share Post"}</h3>
          <button className="share-modal-close" onClick={onClose}>
            <FiX size={18} />
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
              />
              <div className="share-caption-actions">
                <button
                  className="btn-primary"
                  onClick={handleShareToFeed}
                  disabled={sharing}
                >
                  {sharing ? "Sharing..." : "📢 Share Now"}
                </button>
                <button className="btn-secondary" onClick={() => setShowCaptionInput(false)}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="share-to-feed-btn" onClick={() => setShowCaptionInput(true)}>
                <FiShare2 size={18} />
                <span>Share to Community Feed</span>
              </button>

              <div className="share-divider">
                <span>OR</span>
              </div>

              <p className="share-modal-subtitle">Share this {isLecture ? "lecture" : "post"} directly to other platforms:</p>
              <div className="share-options-grid">
                {shareOptions.map((option) =>
                  option.name === "Instagram" ? (
                    <button
                      key={option.name}
                      className="share-option-item"
                      style={{ "--item-bg": option.bgColor, border: "none", cursor: "pointer", background: "transparent" }}
                      onClick={() => { handleInstagramShare(); onClose(); }}
                    >
                      <div className="share-icon-wrapper">{option.icon}</div>
                      <span>{option.name}</span>
                    </button>
                  ) : (
                    <a
                      key={option.name}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="share-option-item"
                      style={{ "--item-bg": option.bgColor }}
                      onClick={onClose}
                    >
                      <div className="share-icon-wrapper">{option.icon}</div>
                      <span>{option.name}</span>
                    </a>
                  )
                )}
              </div>

              {navigator.share && (
                <button className="system-share-btn" onClick={handleSystemShare}>
                  <FiShare2 size={16} />
                  <span>Share via Device Options...</span>
                </button>
              )}

              <div className="share-link-copy-section">
                <input type="text" readOnly value={shareUrl} className="share-link-input" />
                <button className="share-copy-button" onClick={handleCopyLink} title="Copy Link">
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
