import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { communityApi } from "../services/communityApi";
import api from "../services/api";
import toast from "react-hot-toast";
import ShareModal from "../components/ShareModal";
import FilePreviewModal from "../components/FilePreviewModal";
import {
  FiMessageSquare,
  FiMail,
  FiPlus,
  FiUsers,
  FiThumbsUp,
  FiThumbsDown,
  FiMessageCircle,
  FiTrendingUp,
  FiUser,
  FiX,
  FiClock,
  FiBookOpen,
  FiHelpCircle,
  FiBell,
  FiShare2,
  FiSend,
  FiMoreVertical,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiLogOut,
  FiSlash
} from "react-icons/fi";
import "../styles/dashboard.css";
import "../styles/community.css";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";

const renderContentWithLinks = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: "#3b8db3", textDecoration: "underline", fontWeight: "600", wordBreak: "break-all" }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function CommunityHub() {
  const { user, socket, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchUnreadMessageCount = async () => {
    try {
      const res = await communityApi.getUnreadMessagesCount();
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch unread messages count:", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === "feed") {
      fetchPosts();
    } else if (activeTab === "inbox") {
      fetchInbox();
    }
  }, [activeTab, selectedCategory, user]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadMessageCount();
  }, [user]);

  useEffect(() => {
    if (!user || !socket) return;
    const handleNewMessage = () => {
      fetchUnreadMessageCount();
    };
    socket.on("newPrivateMessage", handleNewMessage);
    return () => {
      socket.off("newPrivateMessage", handleNewMessage);
    };
  }, [socket, user]);

  if (!user) return null;

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getPublicPosts({
        category: selectedCategory,
      });
      setPosts(res.data.posts);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async () => {
    try {
      const res = await communityApi.getInbox();
      setInbox(res.data.messages);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const res = await communityApi.likePublicPost(postId);
      setPosts(
        posts.map((post) =>
          post._id === postId
            ? { ...post, likes: res.data.likes, hasLiked: res.data.hasLiked }
            : post,
        ),
      );
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      await communityApi.createPublicPost(postData);
      toast.success("Post created!");
      setShowCreateModal(false);
      fetchPosts();
    } catch (error) {
      toast.error("Failed to create post");
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "question":
        return <FiHelpCircle size={14} />;
      case "announcement":
        return <FiBell size={14} />;
      case "resource":
        return <FiBookOpen size={14} />;
      default:
        return <FiMessageSquare size={14} />;
    }
  };

  return (
    <div className="community-container">
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="community" />
      ) : (
        <StudentSidebar currentPage="community" />
      )}

      <div className="community-main">
        {activeTab === "feed" && (
          <>
            <div className="feed-header">
              <div>
                <h1>Community Feed</h1>
                <p>Join discussions with all students and teachers</p>
              </div>
              <button
                className="create-post-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlus size={18} /> New Post
              </button>
            </div>

            <div className="category-filters">
              <button
                className={`filter-chip ${selectedCategory === "all" ? "active" : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                All Topics
              </button>
              <button
                className={`filter-chip ${selectedCategory === "general" ? "active" : ""}`}
                onClick={() => setSelectedCategory("general")}
              >
                <FiMessageSquare size={12} /> General
              </button>
              <button
                className={`filter-chip ${selectedCategory === "question" ? "active" : ""}`}
                onClick={() => setSelectedCategory("question")}
              >
                <FiHelpCircle size={12} /> Questions
              </button>
              <button
                className={`filter-chip ${selectedCategory === "announcement" ? "active" : ""}`}
                onClick={() => setSelectedCategory("announcement")}
              >
                <FiBell size={12} /> Announcements
              </button>
              <button
                className={`filter-chip ${selectedCategory === "resource" ? "active" : ""}`}
                onClick={() => setSelectedCategory("resource")}
              >
                <FiBookOpen size={12} /> Resources
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading discussions...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No posts yet</h3>
                <p>Be the first to start a discussion!</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="posts-feed">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    getCategoryIcon={getCategoryIcon}
                    onPostDeleted={(deletedId) => {
                      setPosts(posts.filter((p) => p._id !== deletedId));
                    }}
                    onPostUpdated={(updatedPost) => {
                      setPosts(posts.map((p) => p._id === updatedPost._id ? updatedPost : p));
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreatePost={handleCreatePost}
        />
      )}
    </div>
  );
}

const getFileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://${window.location.hostname}:5000${cleanUrl}`;
  }
  return `${window.location.origin}${cleanUrl}`;
};

const renderAttachments = (attachments, onPreview) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="post-attachments-container">
      {attachments.map((file, idx) => {
        const isImage = file.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(file.fileName);
        const isVideo = file.fileType?.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(file.fileName);
        const isAudio = file.fileType?.startsWith("audio/") || /\.(mp3|wav|ogg)$/i.test(file.fileName);
        const absoluteUrl = getFileUrl(file.fileUrl);
        const fileObj = { name: file.fileName, url: absoluteUrl, fileType: file.fileType };

        if (isImage) {
          return (
            <div key={idx} className="attachment-preview-wrapper image-preview" style={{ cursor: "pointer" }} onClick={() => onPreview && onPreview(fileObj)}>
              <img src={absoluteUrl} alt={file.fileName} className="attachment-image" />
              <div className="attachment-file-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🖼️ {file.fileName}</span>
                <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onPreview && onPreview(fileObj)}
                    className="btn-download-link"
                    style={{ background: "#e2eef6", color: "#1e3a5f", border: "1px solid #b1d4e5", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiEye size={14} /> View
                  </button>
                  <a href={absoluteUrl} download={file.fileName} className="btn-download-link" target="_blank" rel="noopener noreferrer">Download</a>
                </div>
              </div>
            </div>
          );
        }

        if (isVideo) {
          return (
            <div key={idx} className="attachment-preview-wrapper video-preview">
              <video src={absoluteUrl} controls className="attachment-video" />
              <div className="attachment-file-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🎥 {file.fileName}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => onPreview && onPreview(fileObj)}
                    className="btn-download-link"
                    style={{ background: "#e2eef6", color: "#1e3a5f", border: "1px solid #b1d4e5", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiEye size={14} /> View
                  </button>
                  <a href={absoluteUrl} download={file.fileName} className="btn-download-link">Download</a>
                </div>
              </div>
            </div>
          );
        }

        if (isAudio) {
          return (
            <div key={idx} className="attachment-preview-wrapper audio-preview">
              <audio src={absoluteUrl} controls className="attachment-audio" />
              <div className="attachment-file-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🎵 {file.fileName}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => onPreview && onPreview(fileObj)}
                    className="btn-download-link"
                    style={{ background: "#e2eef6", color: "#1e3a5f", border: "1px solid #b1d4e5", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiEye size={14} /> View
                  </button>
                  <a href={absoluteUrl} download={file.fileName} className="btn-download-link">Download</a>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={idx} className="attachment-file-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} onClick={() => onPreview && onPreview(fileObj)}>
              <div className="file-icon">📁</div>
              <div className="file-details">
                <span className="file-name" style={{ fontWeight: "600" }}>{file.fileName}</span>
                <span className="file-type" style={{ display: "block", fontSize: "11px", color: "#64748b" }}>{file.fileType || "Document"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => onPreview && onPreview(fileObj)}
                className="btn-download-link"
                style={{ background: "#e2eef6", color: "#1e3a5f", border: "1px solid #b1d4e5", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FiEye size={14} /> View
              </button>
              <a
                href={absoluteUrl}
                download={file.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download-link"
              >
                ⬇️ Download
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderLectureAttachment = (lecture, onPreview) => {
  if (!lecture) return null;
  const file = {
    fileName: lecture.originalName || lecture.title,
    fileUrl: lecture.fileURL,
    fileType: lecture.fileType
  };
  return renderAttachments([file], onPreview);
};

function CommentItem({ comment, user, isCourse, courseId, postId, onlineUsers = [], onDelete }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(comment.replies || []);
  const [likes, setLikes] = useState(comment.likes || []);
  const [isDeleted, setIsDeleted] = useState(false);

  const currentUserId = user?.id || user?._id;
  const isLiked = likes.some((id) => (typeof id === "string" ? id === currentUserId : id._id === currentUserId || id === currentUserId));

  const authorId = comment.author?._id || comment.author?.id || comment.author;
  const canDelete = authorId === currentUserId || user?.role === "admin" || user?.role === "teacher";

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await communityApi.deleteComment(comment._id);
      setIsDeleted(true);
      if (onDelete) onDelete(comment._id);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleChildDelete = (childId) => {
    setReplies(replies.filter((r) => r._id !== childId));
  };

  if (isDeleted) return null;

  const handleLike = async () => {
    try {
      const res = await communityApi.likeComment(comment._id);
      if (res.data.hasLiked) {
        setLikes([...likes, currentUserId]);
      } else {
        setLikes(likes.filter((id) => (typeof id === "string" ? id !== currentUserId : id._id !== currentUserId)));
      }
    } catch (err) {
      toast.error("Failed to like comment");
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      let res;
      if (isCourse && courseId) {
        res = await communityApi.addCourseComment(courseId, postId, {
          content: replyText,
          parentCommentId: comment._id,
        });
      } else {
        res = await communityApi.addPublicComment(postId, {
          content: replyText,
          parentCommentId: comment._id,
        });
      }

      const newReply = {
        ...res.data.comment,
        author: {
          _id: currentUserId,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      };

      setReplies([...replies, newReply]);
      setReplyText("");
      setReplying(false);
    } catch (err) {
      toast.error("Failed to post reply");
    }
  };

  return (
    <div className="inline-comment-item" style={{ marginBottom: "12px" }}>
      <div className="comment-avatar" style={{ position: "relative" }}>
        {comment.author?.profilePicture ? (
          <img
            src={getFileUrl(comment.author.profilePicture)}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          comment.author?.name?.charAt(0).toUpperCase()
        )}
        {onlineUsers.includes(comment.author?._id || comment.author?.id) && (
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              border: "1.5px solid var(--border-light, #ffffff)",
              zIndex: 2,
            }}
            title="Online"
          />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div className="comment-content-bubble">
          <div
            className="comment-author-name"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%" }}
          >
            <div>
              {comment.author?.name}
              <span className="comment-author-role">{comment.author?.role}</span>
            </div>
            {(user?.role === "teacher" || user?.role === "admin") &&
              comment.author?._id !== user?.id &&
              comment.author?._id !== user?._id &&
              comment.author?.role === "student" && (
                <button
                  type="button"
                  title="Block User"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: "2px 6px",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "11px",
                    fontWeight: "600",
                    gap: "2px",
                  }}
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Are you sure you want to suspend student ${comment.author?.name}? They will be logged out immediately and suspended from accessing the application.`
                      )
                    ) {
                      try {
                        await api.post(`/auth/users/${comment.author?._id}/block`);
                        toast.success(`User ${comment.author?.name} has been suspended.`);
                      } catch (err) {
                        toast.error(err.response?.data?.error || "Failed to suspend user.");
                      }
                    }
                  }}
                >
                  <FiSlash size={10} /> Suspend
                </button>
              )}
          </div>
          <p className="comment-text">{comment.content}</p>
        </div>

        {/* Comment Action Links (Like · Reply · Delete · Time) */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px", paddingLeft: "8px", fontSize: "12px" }}>
          <button
            type="button"
            onClick={handleLike}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: isLiked ? "700" : "600",
              color: isLiked ? "#2563eb" : "#64748b",
              padding: 0,
              fontSize: "12px",
            }}
          >
            {isLiked ? "👍 Liked" : "Like"} {likes.length > 0 && `(${likes.length})`}
          </button>
          <button
            type="button"
            onClick={() => setReplying(!replying)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              color: "#64748b",
              padding: 0,
              fontSize: "12px",
            }}
          >
            Reply
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                color: "#ef4444",
                padding: 0,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
              title="Delete Comment"
            >
              <FiTrash2 size={11} /> Delete
            </button>
          )}
          <span className="comment-time" style={{ fontSize: "11px", color: "#94a3b8" }}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Inline Reply Input Box */}
        {replying && (
          <form onSubmit={handleReplySubmit} style={{ display: "flex", gap: "8px", marginTop: "8px", paddingLeft: "8px" }}>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author?.name || "comment"}...`}
              style={{
                flex: 1,
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                background: "#ffffff",
              }}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "6px 14px", borderRadius: "16px", fontSize: "12px", background: "#3b8db3" }}
            >
              Reply
            </button>
          </form>
        )}

        {/* Nested Child Replies */}
        {replies.length > 0 && (
          <div style={{ marginTop: "10px", paddingLeft: "16px", borderLeft: "2px solid #e2e8f0" }}>
            {replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                user={user}
                isCourse={isCourse}
                courseId={courseId}
                postId={postId}
                onlineUsers={onlineUsers}
                onDelete={handleChildDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, getCategoryIcon, onPostDeleted, onPostUpdated }) {
  const { user, onlineUsers } = useAuth();
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?.id || user?._id));
  const [isDisliked, setIsDisliked] = useState(post.dislikes?.includes(user?.id || user?._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [dislikeCount, setDislikeCount] = useState(post.dislikes?.length || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount || 0);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null);

  useEffect(() => {
    if (!showActionsDropdown) return;
    const closeMenu = () => setShowActionsDropdown(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [showActionsDropdown]);

  const handleUpdatePost = async (postId, formData) => {
    try {
      const res = await communityApi.updatePost(postId, formData);
      toast.success("Post updated successfully!");
      if (onPostUpdated) onPostUpdated(res.data.post);
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  useEffect(() => {
    setIsLiked(post.likes?.includes(user?.id || user?._id));
    setIsDisliked(post.dislikes?.includes(user?.id || user?._id));
    setLikeCount(post.likes?.length || 0);
    setDislikeCount(post.dislikes?.length || 0);
    setLocalCommentCount(post.commentCount || 0);
  }, [post, user]);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await communityApi.likePublicPost(post._id);
      setLikeCount(res.data.likes);
      setIsLiked(res.data.hasLiked);
      if (res.data.dislikes !== undefined) {
        setDislikeCount(res.data.dislikes);
        setIsDisliked(res.data.hasDisliked);
      }
    } catch (err) {
      toast.error("Failed to like post");
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    try {
      const res = await communityApi.dislikePublicPost(post._id);
      setDislikeCount(res.data.dislikes);
      setIsDisliked(res.data.hasDisliked);
      if (res.data.likes !== undefined) {
        setLikeCount(res.data.likes);
        setIsLiked(res.data.hasLiked);
      }
    } catch (err) {
      toast.error("Failed to dislike post");
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const res = await communityApi.getPublicPost(post._id);
        setComments(res.data.comments || []);
      } catch (err) {
        toast.error("Failed to load comments");
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await communityApi.addPublicComment(post._id, { content: commentText });
      const newCommentObj = {
        ...res.data.comment,
        author: {
          _id: user.id || user._id,
          name: user.name,
          role: user.role
        }
      };
      setComments([...comments, newCommentObj]);
      setCommentText("");
      setLocalCommentCount(prev => prev + 1);
      toast.success("Comment added!");
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const getCategoryClass = (category) => {
    switch (category) {
      case "question":
        return "category-question";
      case "announcement":
        return "category-announcement";
      case "resource":
        return "category-resource";
      default:
        return "category-general";
    }
  };

  const isOwner = post.author?._id === (user?.id || user?._id) || post.author === (user?.id || user?._id);
  const canDelete = isOwner || user?.role === "admin" || (user?.role === "teacher" && post.author?.role === "student");

  const shareUrl = post.courseId
    ? `${window.location.origin}/community/courses/${post.courseId}/posts/${post._id}`
    : `${window.location.origin}/community/public/posts/${post._id}`;
  const authorName = post.author?.name || "Deleted User";
  const authorRole = post.author?.role || "";
  const authorPic = post.author?.profilePicture || null;
  const isOnline = post.author ? onlineUsers.includes(post.author._id || post.author.id) : false;

  return (
    <div className="post-card" style={{ cursor: "default" }}>
      <div className="post-header">
        <div className="post-author">
          <div className="author-avatar" style={{ position: "relative" }}>
            {authorPic ? (
              <img 
                src={getFileUrl(authorPic)} 
                alt="Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} 
              />
            ) : (
              authorName.charAt(0).toUpperCase()
            )}
            {isOnline && (
              <span 
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  border: "2px solid var(--border-light, #ffffff)",
                  zIndex: 2
                }}
                title="Online"
              />
            )}
          </div>
          <div className="author-info">
            <strong>{authorName}</strong>
            {authorRole && <span className="author-badge">{authorRole}</span>}
          </div>
        </div>
        
        <div className="post-header-right">
          <div className={`post-category ${getCategoryClass(post.category)}`}>
            {getCategoryIcon(post.category)} {post.category}
          </div>

          {(isOwner || canDelete) && (
            <div className="post-actions-dropdown-wrapper">
              <button
                type="button"
                className="btn-post-actions-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionsDropdown(!showActionsDropdown);
                }}
              >
                <FiMoreVertical size={16} />
              </button>
              
              {showActionsDropdown && (
                <div className="post-actions-dropdown-menu">
                  {isOwner && (
                    <button
                      type="button"
                      className="dropdown-item edit-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditModal(true);
                        setShowActionsDropdown(false);
                      }}
                    >
                      <FiEdit3 size={14} /> Edit Post
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="dropdown-item delete-item"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowActionsDropdown(false);
                        if (window.confirm("Are you sure you want to delete this post? This will also delete all comments on it.")) {
                          try {
                            await communityApi.deletePost(post._id);
                            toast.success("Post deleted successfully");
                            if (onPostDeleted) onPostDeleted(post._id);
                          } catch (err) {
                            toast.error("Failed to delete post");
                          }
                        }
                      }}
                    >
                      <FiTrash2 size={14} /> Delete Post
                    </button>
                  )}
                  {(user?.role === "teacher" || user?.role === "admin") && post.author?._id !== user?.id && post.author?._id !== user?._id && post.author?.role === "student" && (
                    <button
                      type="button"
                      className="dropdown-item delete-item"
                      style={{ color: "#ef4444" }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowActionsDropdown(false);
                        if (window.confirm(`Are you sure you want to suspend student ${post.author.name}? They will be logged out immediately and suspended from accessing the application.`)) {
                          try {
                            await api.post(`/auth/users/${post.author._id}/block`);
                            toast.success(`User ${post.author.name} has been suspended.`);
                          } catch (err) {
                            toast.error(err.response?.data?.error || "Failed to suspend user.");
                          }
                        }
                      }}
                    >
                      <FiSlash size={14} /> Suspend User
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {post.title && post.title !== "Untitled" ? <h3 className="post-title">{post.title}</h3> : null}
      {post.content && (
        <p className="post-content">
          {renderContentWithLinks(post.sharedPostId ? post.content : (post.content.length > 180 ? `${post.content.substring(0, 180)}...` : post.content))}
        </p>
      )}

      {renderAttachments(post.attachments, setPreviewModalFile)}
      {renderLectureAttachment(post.lecture, setPreviewModalFile)}

      {post.sharedPostId && (
        <div className="shared-post-nested-card">
          <div className="shared-post-header">
            <div className="shared-post-author">
              <div className="shared-author-avatar">
                {post.sharedPostId.author?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="shared-author-info">
                <strong>{post.sharedPostId.author?.name}</strong>
                <span className="shared-author-badge">{post.sharedPostId.author?.role}</span>
              </div>
            </div>
            <span className="shared-post-date">
              {new Date(post.sharedPostId.createdAt).toLocaleDateString()}
            </span>
          </div>
          {post.sharedPostId.title && post.sharedPostId.title !== "Untitled" ? <h4 className="shared-post-title">{post.sharedPostId.title}</h4> : null}
          <p className="shared-post-content">
            {renderContentWithLinks(post.sharedPostId.content)}
          </p>
          {renderAttachments(post.sharedPostId.attachments, setPreviewModalFile)}
          {renderLectureAttachment(post.sharedPostId.lecture, setPreviewModalFile)}
        </div>
      )}
      
      <div className="post-stats">
        <div className="stat-item">
          <FiThumbsUp size={14} />
          <span>{likeCount} likes</span>
        </div>
        <div className="stat-item">
          <FiThumbsDown size={14} />
          <span>{dislikeCount} dislikes</span>
        </div>
        <div className="stat-item">
          <FiMessageCircle size={14} />
          <span>{localCommentCount} comments</span>
        </div>
        <div className="stat-item">
          <FiClock size={14} />
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="post-actions">
        <button
          className={`action-btn like-btn ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
        >
          <FiThumbsUp size={16} />
          <span>{isLiked ? "Liked" : "Like"}</span>
        </button>
        <button
          className={`action-btn dislike-btn ${isDisliked ? "disliked" : ""}`}
          onClick={handleDislike}
        >
          <FiThumbsDown size={16} />
          <span>{isDisliked ? "Disliked" : "Dislike"}</span>
        </button>
        <button className="action-btn comment-btn" onClick={toggleComments}>
          <FiMessageCircle size={16} />
          <span>Comment</span>
        </button>
        <button
          className="action-btn share-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowShareModal(true);
          }}
        >
          <FiShare2 size={16} />
          <span>Share</span>
        </button>
      </div>

      {showComments && (
        <div className="inline-comments-section">
          <hr className="comments-divider" />
          <form className="inline-comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              required
              className="inline-comment-input"
            />
            <button type="submit" className="inline-comment-submit-btn">
              <FiSend size={14} />
            </button>
          </form>

          {loadingComments ? (
            <div className="inline-comments-loading">
              <div className="spinner-small"></div>
            </div>
          ) : comments.length === 0 ? (
            <p className="no-comments-placeholder">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="inline-comments-list">
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  user={user}
                  isCourse={false}
                  postId={post._id}
                  onlineUsers={onlineUsers}
                  onDelete={(deletedId) => {
                    setComments(comments.filter((c) => c._id !== deletedId));
                    setLocalCommentCount((prev) => Math.max(0, prev - 1));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onUpdatePost={handleUpdatePost}
        />
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        postTitle={post.title}
        postId={post._id}
        fileUrl={
          post.lecture?.fileURL || 
          post.attachments?.[0]?.fileUrl || 
          post.sharedPostId?.lecture?.fileURL || 
          post.sharedPostId?.attachments?.[0]?.fileUrl || 
          null
        }
      />
      <FilePreviewModal
        isOpen={!!previewModalFile}
        onClose={() => setPreviewModalFile(null)}
        file={previewModalFile}
      />
    </div>
  );
}

function CreatePostModal({ onClose, onCreatePost }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content) {
      toast.error("Please write something");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("category", category);
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await onCreatePost(formData);
      setContent("");
      setCategory("general");
      setSelectedFiles([]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Post</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <div className="category-select">
              <button
                type="button"
                className={`category-option ${category === "general" ? "selected" : ""}`}
                onClick={() => setCategory("general")}
              >
                <FiMessageSquare size={14} /> General
              </button>
              <button
                type="button"
                className={`category-option ${category === "question" ? "selected" : ""}`}
                onClick={() => setCategory("question")}
              >
                <FiHelpCircle size={14} /> Question
              </button>
              <button
                type="button"
                className={`category-option ${category === "announcement" ? "selected" : ""}`}
                onClick={() => setCategory("announcement")}
              >
                <FiBell size={14} /> Announcement
              </button>
              <button
                type="button"
                className={`category-option ${category === "resource" ? "selected" : ""}`}
                onClick={() => setCategory("resource")}
              >
                <FiBookOpen size={14} /> Resource
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Write your post here..."
              required
            />
          </div>

          <div className="form-group">
            <label>Attachments (Images, Audio, Video, PDF, Docs)</label>
            <div className="file-upload-zone">
              <label htmlFor="modal-file-upload" className="file-upload-label">
                <FiPlus size={20} />
                <span>Choose Files</span>
              </label>
              <input
                id="modal-file-upload"
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                  }
                }}
                style={{ display: "none" }}
              />
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="selected-files-list">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="selected-file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                      }}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Posting..." : "📢 Post"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPostModal({ post, onClose, onUpdatePost }) {
  const [content, setContent] = useState(post.content || "");
  const [category, setCategory] = useState(post.category || "general");
  const [existingAttachments, setExistingAttachments] = useState(post.attachments || []);
  const [removedAttachments, setRemovedAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content) {
      toast.error("Please write something");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("category", category);
      
      removedAttachments.forEach((url) => {
        formData.append("removedAttachments", url);
      });

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await onUpdatePost(post._id, formData);
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Post</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <div className="category-select">
              <button
                type="button"
                className={`category-option ${category === "general" ? "selected" : ""}`}
                onClick={() => setCategory("general")}
              >
                <FiMessageSquare size={14} /> General
              </button>
              <button
                type="button"
                className={`category-option ${category === "question" ? "selected" : ""}`}
                onClick={() => setCategory("question")}
              >
                <FiHelpCircle size={14} /> Question
              </button>
              <button
                type="button"
                className={`category-option ${category === "announcement" ? "selected" : ""}`}
                onClick={() => setCategory("announcement")}
              >
                <FiBell size={14} /> Announcement
              </button>
              <button
                type="button"
                className={`category-option ${category === "resource" ? "selected" : ""}`}
                onClick={() => setCategory("resource")}
              >
                <FiBookOpen size={14} /> Resource
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
          </div>

          {existingAttachments.length > 0 && (
            <div className="form-group">
              <label>Current Attachments</label>
              <div className="existing-attachments-list">
                {existingAttachments.map((file, idx) => {
                  const isRemoved = removedAttachments.includes(file.fileUrl);
                  return (
                    <div key={idx} className={`existing-attachment-item ${isRemoved ? "removed" : ""}`}>
                      <span className="file-name" style={{ textDecoration: isRemoved ? "line-through" : "none" }}>
                        {file.fileName}
                      </span>
                      <button
                        type="button"
                        className="btn-remove-existing"
                        onClick={() => {
                          if (isRemoved) {
                            setRemovedAttachments(removedAttachments.filter((url) => url !== file.fileUrl));
                          } else {
                            setRemovedAttachments([...removedAttachments, file.fileUrl]);
                          }
                        }}
                      >
                        {isRemoved ? "Undo Delete" : "🗑️ Delete"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Attach New Files</label>
            <div className="file-upload-zone">
              <label htmlFor="edit-modal-file-upload" className="file-upload-label">
                <FiPlus size={20} />
                <span>Choose Files</span>
              </label>
              <input
                id="edit-modal-file-upload"
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                  }
                }}
                style={{ display: "none" }}
              />
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="selected-files-list">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="selected-file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                      }}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
