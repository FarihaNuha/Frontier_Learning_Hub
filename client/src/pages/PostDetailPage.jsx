import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { communityApi } from "../services/communityApi";
import toast from "react-hot-toast";
import ShareModal from "../components/ShareModal";
import {
  FiArrowLeft,
  FiThumbsUp,
  FiMessageCircle,
  FiUser,
  FiClock,
  FiSend,
  FiShare2,
} from "react-icons/fi";
import "../styles/community.css";

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

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getPost(id);
      setPost(res.data.post);
      setComments(res.data.comments);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load post");
      navigate("/community");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await communityApi.likePost(id);
      setPost({ ...post, likes: res.data.likes, hasLiked: res.data.hasLiked });
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await communityApi.addComment(id, {
        content: newComment,
        parentCommentId: replyTo?._id || null,
      });
      toast.success("Comment added!");
      setNewComment("");
      setReplyTo(null);
      fetchPost();
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="post-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="post-detail-container">
      <div className="post-detail-header">
        <button className="back-btn" onClick={() => navigate("/community")}>
          <FiArrowLeft size={20} /> Back to Community
        </button>
      </div>

      <div className="post-detail-card">
        <div className="post-detail-meta">
          <div className="post-author-large">
            <div className="author-avatar-large">
              <FiUser size={28} />
            </div>
            <div>
              <strong>{post.author?.name}</strong>
              <span className="author-role">{post.author?.role}</span>
            </div>
          </div>
          <span className="post-date">
            <FiClock size={14} /> {new Date(post.createdAt).toLocaleString()}
          </span>
        </div>

        {post.title && post.title !== "Untitled" ? <h1 className="post-detail-title">{post.title}</h1> : null}
        <div className="post-detail-content">{renderContentWithLinks(post.content)}</div>

        <div className="post-detail-stats">
          <button
            className={`like-button ${post.hasLiked ? "liked" : ""}`}
            onClick={handleLike}
          >
            <FiThumbsUp size={18} />
            <span>{post.likes?.length || 0} likes</span>
          </button>
          <button
            className="action-btn share-btn"
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#6b89a0",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              padding: "4px 8px",
              marginLeft: "15px"
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowShareModal(true);
            }}
          >
            <FiShare2 size={16} />
            <span>Share</span>
          </button>
        </div>

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareUrl={post.courseId
            ? `${window.location.origin}/community/courses/${post.courseId}/posts/${post._id}`
            : `${window.location.origin}/community/public/posts/${post._id}`}
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
      </div>

      <div className="comment-section">
        <h3>Comments ({comments.length})</h3>

        <form className="comment-form" onSubmit={handleComment}>
          <div className="comment-input-wrapper">
            <div className="comment-avatar-small">
              <FiUser size={16} />
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                replyTo
                  ? `Replying to ${replyTo.author?.name}...`
                  : "Write a comment..."
              }
              rows={3}
            />
          </div>
          {replyTo && (
            <div className="replying-to">
              <span>Replying to {replyTo.author?.name}</span>
              <button type="button" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </div>
          )}
          <button
            type="submit"
            className="submit-comment-btn"
            disabled={submitting}
          >
            <FiSend size={16} /> {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </div>
    </div>
  );
}
