const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/communityController");
const upload = require("../middleware/upload");

// Public Community Routes
router.post("/public/posts", verifyToken, upload.array("files"), ctrl.createPublicPost);
router.get("/public/posts", verifyToken, ctrl.getPublicPosts);
router.get("/public/posts/:postId", verifyToken, ctrl.getPublicPost);
router.post(
  "/public/posts/:postId/like",
  verifyToken,
  ctrl.toggleLikePublicPost,
);
router.post(
  "/public/posts/:postId/dislike",
  verifyToken,
  ctrl.toggleDislikePublicPost,
);
router.post(
  "/public/posts/:postId/comments",
  verifyToken,
  ctrl.addPublicComment,
);

// Course-wise Community Routes
router.post("/courses/:courseId/posts", verifyToken, upload.array("files"), ctrl.createCoursePost);
router.get("/courses/:courseId/posts", verifyToken, ctrl.getCoursePosts);
router.get("/courses/:courseId/posts/:postId", verifyToken, ctrl.getCoursePost);
router.post(
  "/courses/:courseId/posts/:postId/like",
  verifyToken,
  ctrl.toggleLikeCoursePost,
);
router.post(
  "/courses/:courseId/posts/:postId/dislike",
  verifyToken,
  ctrl.toggleDislikeCoursePost,
);
router.post(
  "/courses/:courseId/posts/:postId/comments",
  verifyToken,
  ctrl.addCourseComment,
);

// Comments
router.post("/comments/:id/like", verifyToken, ctrl.toggleLikeComment);
router.delete("/comments/:id", verifyToken, ctrl.deleteComment);

// Share post
router.post("/posts/:postId/share", verifyToken, ctrl.sharePost);

// Edit and Delete Post
router.put("/posts/:postId", verifyToken, upload.array("files"), ctrl.updatePost);
router.delete("/posts/:postId", verifyToken, ctrl.deletePost);

// Private Messages
router.get("/messages/unread-count", verifyToken, ctrl.getUnreadMessagesCount);
router.post("/messages", verifyToken, upload.array("files"), ctrl.sendMessage);
router.get("/inbox", verifyToken, ctrl.getInbox);
router.get("/conversation/:userId", verifyToken, ctrl.getConversation);
router.get("/users", verifyToken, ctrl.getUsers);
router.delete("/messages/:messageId", verifyToken, ctrl.deleteMessage);
router.post("/messages/:messageId/react", verifyToken, ctrl.toggleReaction);

// Student-Teacher Contact Requests
router.post("/contact-requests", verifyToken, ctrl.createContactRequest);
router.get("/contact-requests", verifyToken, ctrl.getContactRequests);
router.put("/contact-requests/:requestId/respond", verifyToken, ctrl.respondToContactRequest);

module.exports = router;
