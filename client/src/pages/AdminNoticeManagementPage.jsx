import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiClipboard,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiBookmark,
  FiCalendar,
  FiPaperclip,
  FiX,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminNoticeManagementPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isPinned, setIsPinned] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/service/notices");
      setNotices(res.data.notices || []);
    } catch (err) {
      toast.error("Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingNotice(null);
    setTitle("");
    setContent("");
    setCategory("General");
    setIsPinned(false);
    setIsScheduled(false);
    setScheduledAt("");
    setPdfUrl("");
    setImageUrls("");
    setShowModal(true);
  };

  const handleOpenEditModal = (n) => {
    setEditingNotice(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category || "General");
    setIsPinned(Boolean(n.isPinned));
    setIsScheduled(Boolean(n.isScheduled));
    setScheduledAt(n.scheduledAt ? new Date(n.scheduledAt).toISOString().slice(0, 16) : "");
    setPdfUrl(n.pdfUrl || "");
    setImageUrls((n.imageUrls || []).join("\n"));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and Content are required.");
      return;
    }

    setSubmitting(true);
    const imgArr = imageUrls.split("\n").map((s) => s.trim()).filter(Boolean);

    try {
      if (editingNotice) {
        await api.put(`/service/notices/${editingNotice._id}`, {
          title,
          content,
          category,
          isPinned,
          isScheduled,
          scheduledAt: isScheduled && scheduledAt ? scheduledAt : null,
          pdfUrl,
          imageUrls: imgArr,
        });
        toast.success("Notice updated successfully!");
      } else {
        await api.post("/service/notices", {
          title,
          content,
          category,
          isPinned,
          isScheduled,
          scheduledAt: isScheduled && scheduledAt ? scheduledAt : null,
          pdfUrl,
          imageUrls: imgArr,
        });
        toast.success("Notice created and notifications sent!");
      }

      setShowModal(false);
      fetchNotices();
    } catch (err) {
      toast.error("Notice operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return;

    try {
      await api.delete(`/service/notices/${id}`);
      toast.success("Notice deleted.");
      fetchNotices();
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await api.post(`/service/notices/pin/${id}`);
      toast.success("Notice pin status updated.");
      fetchNotices();
    } catch (err) {
      toast.error("Pin toggle failed.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiClipboard size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Official Notice Management</h1>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Create, edit, pin, schedule, and attach PDFs/Images to official university notices.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#3b8db3", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
          >
            <FiPlus size={16} /> Create Official Notice
          </button>
        </div>

        {/* Notices Grid */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading notices...</div>
        ) : notices.length === 0 ? (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "14px", textAlign: "center", color: "#94a3b8" }}>
            <FiClipboard size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#475569" }}>No notices published yet</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {notices.map((n) => (
              <div key={n._id} style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: n.isPinned ? "2px solid #3b8db3" : "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {n.isPinned && (
                        <span style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <FiBookmark size={12} /> Pinned
                        </span>
                      )}
                      <span style={{ background: "rgba(59,141,179,0.12)", color: "#3b8db3", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px" }}>
                        {n.category || "General"}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>{n.title}</h3>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                      Issued By: <strong>{n.authorName || "Registrar"}</strong> • {new Date(n.createdAt).toLocaleDateString()} {n.isScheduled && `• Scheduled for ${new Date(n.scheduledAt).toLocaleString()}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button onClick={() => handleTogglePin(n._id)} title="Pin / Unpin Notice" style={{ padding: "6px 12px", background: n.isPinned ? "#e0f2fe" : "#f1f5f9", color: n.isPinned ? "#0369a1" : "#475569", border: "none", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
                      {n.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button onClick={() => handleOpenEditModal(n)} style={{ padding: "6px 12px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
                      <FiEdit size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(n._id)} style={{ padding: "6px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
                      <FiTrash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: "14px", color: "#334155", whiteSpace: "pre-line", margin: "0 0 16px 0" }}>{n.content}</p>

                {/* Attachments */}
                {(n.pdfUrl || (n.imageUrls && n.imageUrls.length > 0)) && (
                  <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    {n.pdfUrl && (
                      <a href={n.pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#3b8db3", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FiPaperclip size={14} /> Open PDF Attachment
                      </a>
                    )}
                    {(n.imageUrls || []).map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontWeight: 600, fontSize: "13px" }}>
                        Image Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "600px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>{editingNotice ? "Edit Notice" : "Create Official Notice"}</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setShowModal(false)} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Notice Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Official Midterm Exam Schedule 2023-24" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}>
                    <option value="General">General</option>
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam</option>
                    <option value="Registration">Registration</option>
                    <option value="Event">Event</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Notice Content *</label>
                  <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} required placeholder="Write detailed notice announcement..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", outline: "none" }} />
                </div>

                <div style={{ display: "flex", gap: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> Pin to Top of Dashboard
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} /> Schedule Notice
                  </label>
                </div>

                {isScheduled && (
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Scheduled Date & Time</label>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }} />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>PDF Attachment URL (Optional)</label>
                  <input type="url" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Image URLs (One per line, Optional)</label>
                  <textarea rows={2} value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }} />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={submitting} style={{ padding: "10px 20px", background: "#3b8db3", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Saving..." : editingNotice ? "Update Notice" : "Publish Notice"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
