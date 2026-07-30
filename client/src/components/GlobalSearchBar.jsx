import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiSearch,
  FiUser,
  FiBookOpen,
  FiBell,
  FiFileText,
  FiAward,
  FiX,
  FiArrowRight,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/service/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
      {/* Search Input Box */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#ffffff",
          border: "1.5px solid #cbd5e1",
          borderRadius: "10px",
          padding: "8px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <FiSearch size={17} color="#64748b" />
        <input
          type="text"
          placeholder="Global search students, courses, notices..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            fontSize: "13.5px",
            color: "#0f172a",
            background: "transparent",
          }}
        />
        {query && (
          <FiX
            size={16}
            color="#94a3b8"
            cursor="pointer"
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
          />
        )}
      </div>

      {/* Instant Global Search Results Dropdown */}
      {isOpen && query.trim() && (
        <div
          style={{
            position: "absolute",
            top: "48px",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            border: "1px solid #cbd5e1",
            maxHeight: "480px",
            overflowY: "auto",
            zIndex: 1100,
            padding: "16px",
          }}
        >
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Searching across system...
            </div>
          ) : !results || results.totalMatches === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
              No matches found for "{query}"
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Students Match */}
              {results.students?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                    🎓 Students ({results.students.length})
                  </div>
                  {results.students.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => setIsOpen(false)}
                      style={{ padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                    >
                      <strong>{s.name}</strong> <span style={{ color: "#3b8db3", fontSize: "12px" }}>({s.studentId})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Teachers Match */}
              {results.teachers?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                    👨‍🏫 Teachers ({results.teachers.length})
                  </div>
                  {results.teachers.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => setIsOpen(false)}
                      style={{ padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                    >
                      <strong>{t.name}</strong> <span style={{ color: "#64748b", fontSize: "12px" }}>({t.email})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Courses Match */}
              {results.courses?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                    📚 Courses ({results.courses.length})
                  </div>
                  {results.courses.map((c) => (
                    <div
                      key={c._id}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/course/${c._id}`);
                      }}
                      style={{ padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#3b8db3", fontWeight: 600 }}
                    >
                      {c.displayCode} - {c.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Notices Match */}
              {results.notices?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                    📢 Notices ({results.notices.length})
                  </div>
                  {results.notices.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => setIsOpen(false)}
                      style={{ padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                    >
                      <strong>{n.title}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
