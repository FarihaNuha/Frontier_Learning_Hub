const CommunityPost = require("../models/CommunityPost");
const CommunityComment = require("../models/CommunityComment");
const PrivateMessage = require("../models/PrivateMessage");
const User = require("../models/User");
const Course = require("../models/Course");
const ContactRequest = require("../models/ContactRequest");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");

// ==================== PUBLIC/GLOBAL COMMUNITY ====================

exports.createPublicPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
    }

    const post = await CommunityPost.create({
      title: title || "Untitled",
      content,
      category: category || "general",
      author: req.user.uid,
      courseId: null,
      attachments,
    });

    await post.populate("author", "name email role profilePicture");

    // Notify all other users about the public post
    const otherUsers = await User.find({ _id: { $ne: req.user.uid } });

    for (const recipient of otherUsers) {
      try {
        await Notification.create({
          userId: recipient._id,
          title: "📢 New Community Feed Post!",
          message: `"${title}" has been posted in the community hub by ${post.author.name}`,
          type: "community_post",
          link: `/community/public/posts/${post._id}`,
        });

        const io = getIO();
        if (io) {
          io.to(`user_${recipient._id}`).emit("newNotification", {
            title: "📢 New Community Feed Post!",
            message: `"${title}" has been posted in the community hub by ${post.author.name}`,
            type: "community_post",
            link: `/community/public/posts/${post._id}`,
          });
        }
      } catch (err) {
        console.error("Failed to create public post notification for user:", recipient._id, err);
      }
    }

    // Send emails via queue (rate-limited, non-blocking)
    if (otherUsers.length > 0) {
      for (const recipient of otherUsers) {
        if (recipient.email) {
          const { subject, html } = emailTemplates.newCommunityPost(
            recipient.name,
            post.author.name,
            title,
            "Public Feed"
          );
          queueEmail(recipient.email, subject, html);
        }
      }
    }

    res.status(201).json({ post });
  } catch (error) {
    console.error("Create public post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPublicPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { courseId: null };

    if (category && category !== "all") {
      filter.category = category;
    }

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email role profilePicture")
      .populate("lecture")
      .populate({
        path: "sharedPostId",
        populate: [
          { path: "author", select: "name role email" },
          { path: "lecture" }
        ]
      })
      .sort({ createdAt: -1 });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await CommunityComment.countDocuments({
          postId: post._id,
        });
        return { ...post.toObject(), commentCount };
      }),
    );

    res.json({ posts: postsWithCounts });
  } catch (error) {
    console.error("Get public posts error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPublicPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findOne({
      _id: postId,
      courseId: null,
    })
      .populate("author", "name email role profilePicture")
      .populate("lecture")
      .populate({
        path: "sharedPostId",
        populate: [
          { path: "author", select: "name role email" },
          { path: "lecture" }
        ]
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comments = await CommunityComment.find({
      postId: post._id,
      parentCommentId: null,
    })
      .populate("author", "name email role profilePicture")
      .sort({ createdAt: 1 });

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CommunityComment.find({
          parentCommentId: comment._id,
        })
          .populate("author", "name email role profilePicture")
          .sort({ createdAt: 1 });
        return { ...comment.toObject(), replies };
      }),
    );

    res.json({ post, comments: commentsWithReplies });
  } catch (error) {
    console.error("Get public post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleLikePublicPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await CommunityPost.findOne({ _id: postId, courseId: null });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.dislikes) post.dislikes = [];

    const hasLiked = post.likes.includes(req.user.uid);
    const hasDisliked = post.dislikes.includes(req.user.uid);

    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user.uid);
    } else {
      post.likes.push(req.user.uid);
      if (hasDisliked) {
        post.dislikes = post.dislikes.filter((id) => id.toString() !== req.user.uid);
      }
    }

    await post.save();
    res.json({
      likes: post.likes.length,
      hasLiked: !hasLiked,
      dislikes: post.dislikes.length,
      hasDisliked: hasLiked ? false : post.dislikes.includes(req.user.uid),
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleDislikePublicPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await CommunityPost.findOne({ _id: postId, courseId: null });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.dislikes) post.dislikes = [];

    const hasLiked = post.likes.includes(req.user.uid);
    const hasDisliked = post.dislikes.includes(req.user.uid);

    if (hasDisliked) {
      post.dislikes = post.dislikes.filter((id) => id.toString() !== req.user.uid);
    } else {
      post.dislikes.push(req.user.uid);
      if (hasLiked) {
        post.likes = post.likes.filter((id) => id.toString() !== req.user.uid);
      }
    }

    await post.save();
    res.json({
      likes: post.likes.length,
      hasLiked: hasDisliked ? false : post.likes.includes(req.user.uid),
      dislikes: post.dislikes.length,
      hasDisliked: !hasDisliked,
    });
  } catch (error) {
    console.error("Toggle dislike error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.addPublicComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const { postId } = req.params;

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const post = await CommunityPost.findOne({ _id: postId, courseId: null });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await CommunityComment.create({
      postId,
      content,
      author: req.user.uid,
      parentCommentId: parentCommentId || null,
    });

    await comment.populate("author", "name email role profilePicture");

    res.status(201).json({ comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== COURSE-WISE COMMUNITY ====================

exports.createCoursePost = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const { courseId } = req.params;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isEnrolled =
      course.students.includes(req.user.uid) ||
      course.teacher.toString() === req.user.uid;
    if (!isEnrolled) {
      return res
        .status(403)
        .json({ error: "You are not enrolled in this course" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
    }

    const post = await CommunityPost.create({
      title: title || "Untitled",
      content,
      category: category || "general",
      author: req.user.uid,
      courseId,
      attachments,
    });

    await post.populate("author", "name email role profilePicture");

    // Gather recipients to notify (exclude the author)
    const userIdsToNotify = [...course.students];
    if (course.teacher && course.teacher.toString() !== req.user.uid) {
      userIdsToNotify.push(course.teacher);
    }

    const recipients = await User.find({
      _id: { $in: userIdsToNotify, $ne: req.user.uid }
    });

    // Create notifications and emit socket events
    for (const recipient of recipients) {
      try {
        await Notification.create({
          userId: recipient._id,
          title: `New Post in ${course.displayCode} Community`,
          message: `"${title}" has been posted in the community hub by ${post.author.name}`,
          type: "community_post",
          link: `/community/courses/${courseId}/posts/${post._id}`,
        });

        const io = getIO();
        if (io) {
          io.to(`user_${recipient._id}`).emit("newNotification", {
            title: `New Post in ${course.displayCode} Community`,
            message: `"${title}" has been posted in the community hub by ${post.author.name}`,
            type: "community_post",
            link: `/community/courses/${courseId}/posts/${post._id}`,
          });
        }
      } catch (err) {
        console.error("Failed to create post notification for user:", recipient._id, err);
      }
    }

    // Send emails via queue (rate-limited, non-blocking)
    if (recipients.length > 0) {
      for (const recipient of recipients) {
        if (recipient.email) {
          const { subject, html } = emailTemplates.newCommunityPost(
            recipient.name,
            post.author.name,
            title,
            course.displayCode
          );
          queueEmail(recipient.email, subject, html);
        }
      }
    }

    res.status(201).json({ post });
  } catch (error) {
    console.error("Create course post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCoursePosts = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { category } = req.query;

    const filter = { courseId };
    if (category && category !== "all") {
      filter.category = category;
    }

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email role profilePicture")
      .populate("lecture")
      .populate({
        path: "sharedPostId",
        populate: [
          { path: "author", select: "name role email" },
          { path: "lecture" }
        ]
      })
      .sort({ createdAt: -1 });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await CommunityComment.countDocuments({
          postId: post._id,
        });
        return { ...post.toObject(), commentCount };
      }),
    );

    res.json({ posts: postsWithCounts });
  } catch (error) {
    console.error("Get course posts error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCoursePost = async (req, res) => {
  try {
    const { courseId, postId } = req.params;

    const post = await CommunityPost.findOne({
      _id: postId,
      courseId,
    })
      .populate("author", "name email role profilePicture")
      .populate("lecture")
      .populate({
        path: "sharedPostId",
        populate: [
          { path: "author", select: "name role email" },
          { path: "lecture" }
        ]
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comments = await CommunityComment.find({
      postId: post._id,
      parentCommentId: null,
    })
      .populate("author", "name email role profilePicture")
      .sort({ createdAt: 1 });

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CommunityComment.find({
          parentCommentId: comment._id,
        })
          .populate("author", "name email role profilePicture")
          .sort({ createdAt: 1 });
        return { ...comment.toObject(), replies };
      }),
    );

    res.json({ post, comments: commentsWithReplies });
  } catch (error) {
    console.error("Get course post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleLikeCoursePost = async (req, res) => {
  try {
    const { courseId, postId } = req.params;
    const post = await CommunityPost.findOne({ _id: postId, courseId });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.dislikes) post.dislikes = [];

    const hasLiked = post.likes.includes(req.user.uid);
    const hasDisliked = post.dislikes.includes(req.user.uid);

    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user.uid);
    } else {
      post.likes.push(req.user.uid);
      if (hasDisliked) {
        post.dislikes = post.dislikes.filter((id) => id.toString() !== req.user.uid);
      }
    }

    await post.save();
    res.json({
      likes: post.likes.length,
      hasLiked: !hasLiked,
      dislikes: post.dislikes.length,
      hasDisliked: hasLiked ? false : post.dislikes.includes(req.user.uid),
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleDislikeCoursePost = async (req, res) => {
  try {
    const { courseId, postId } = req.params;
    const post = await CommunityPost.findOne({ _id: postId, courseId });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.dislikes) post.dislikes = [];

    const hasLiked = post.likes.includes(req.user.uid);
    const hasDisliked = post.dislikes.includes(req.user.uid);

    if (hasDisliked) {
      post.dislikes = post.dislikes.filter((id) => id.toString() !== req.user.uid);
    } else {
      post.dislikes.push(req.user.uid);
      if (hasLiked) {
        post.likes = post.likes.filter((id) => id.toString() !== req.user.uid);
      }
    }

    await post.save();
    res.json({
      likes: post.likes.length,
      hasLiked: hasDisliked ? false : post.likes.includes(req.user.uid),
      dislikes: post.dislikes.length,
      hasDisliked: !hasDisliked,
    });
  } catch (error) {
    console.error("Toggle dislike error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.addCourseComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const { courseId, postId } = req.params;

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const post = await CommunityPost.findOne({ _id: postId, courseId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await CommunityComment.create({
      postId,
      content,
      author: req.user.uid,
      parentCommentId: parentCommentId || null,
    });

    await comment.populate("author", "name email role profilePicture");

    res.status(201).json({ comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== COMMENTS ====================

exports.toggleLikeComment = async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const hasLiked = comment.likes.includes(req.user.uid);

    if (hasLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== req.user.uid,
      );
    } else {
      comment.likes.push(req.user.uid);
    }

    await comment.save();
    res.json({ likes: comment.likes.length, hasLiked: !hasLiked });
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== PRIVATE MESSAGES ====================

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, subject, content } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver is required" });
    }

    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: "Message content or file is required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    const sender = await User.findById(req.user.uid);
    if (sender && sender.role === "student" && receiver.role === "teacher") {
      const now = new Date();
      const activeRequest = await ContactRequest.findOne({
        student: req.user.uid,
        teacher: receiverId,
        status: "accepted",
        scheduleStart: { $lte: now },
        scheduleEnd: { $gte: now }
      });
      if (!activeRequest) {
        return res.status(403).json({ error: "You cannot message this teacher outside of your scheduled contact hours. Please send a contact request or wait for your approved slot." });
      }
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
    }

    const message = await PrivateMessage.create({
      sender: req.user.uid,
      receiver: receiverId,
      subject: subject || "Message",
      content: content || "",
      attachments,
    });

    await message.populate("sender", "name email");

    const io = getIO();
    io?.to(`user_${receiverId}`).emit("newPrivateMessage", {
      message: message,
    });

    // Create system notification for receiver
    const senderUser = await User.findById(req.user.uid);
    const senderName = senderUser ? senderUser.name : "A user";
    const messageContent = content || "";
    const previewContent = messageContent.length > 50 ? `${messageContent.substring(0, 50)}...` : messageContent;
    const msgLink = `/community/messages/${req.user.uid}`;

    try {
      await Notification.create({
        userId: receiverId,
        title: `✉️ New Message from ${senderName}`,
        message: previewContent,
        type: "chat_message",
        link: msgLink,
      });

      if (io) {
        io.to(`user_${receiverId}`).emit("newNotification", {
          title: `✉️ New Message from ${senderName}`,
          message: previewContent,
          type: "chat_message",
          link: msgLink,
        });
      }
    } catch (err) {
      console.error("Failed to create message notification:", err);
    }

    // Send email to receiver via queue (rate-limited, non-blocking)
    if (receiver.email) {
      const emailData = emailTemplates.newPrivateMessage(
        receiver.name,
        senderName,
        messageContent,
        req.user.uid
      );
      queueEmail(receiver.email, emailData.subject, emailData.html);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const messages = await PrivateMessage.find({ receiver: req.user.uid })
      .populate("sender", "name email role profilePicture")
      .sort({ createdAt: -1 });

    const unreadCount = messages.filter((m) => !m.isRead).length;
    res.json({ messages, unreadCount });
  } catch (error) {
    console.error("Get inbox error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await PrivateMessage.find({
      $or: [
        { sender: req.user.uid, receiver: userId },
        { sender: userId, receiver: req.user.uid },
      ],
    })
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture")
      .sort({ createdAt: 1 });

    await PrivateMessage.updateMany(
      { sender: userId, receiver: req.user.uid, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    res.json({ messages });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await PrivateMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== req.user.uid) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    await PrivateMessage.findByIdAndDelete(messageId);

    const io = getIO();
    io?.to(`user_${message.receiver}`).emit("messageDeleted", {
      messageId,
      conversationWith: message.sender,
    });

    res.json({ message: "Message deleted successfully", messageId });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.uid;

    const message = await PrivateMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId && r.emoji === emoji,
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, user: userId });
    }

    await message.save();

    const otherUser = message.sender.toString() === userId ? message.receiver : message.sender;
    const io = getIO();
    io?.to(`user_${otherUser}`).emit("messageReaction", {
      messageId,
      reactions: message.reactions,
    });

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error("Toggle reaction error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const count = await PrivateMessage.countDocuments({
      receiver: req.user.uid,
      isRead: false,
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Get unread messages count error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const { courseId } = req.query;

    let filter = { _id: { $ne: currentUserId } };

    if (courseId) {
      const Course = require("../models/Course");
      const course = await Course.findById(courseId);
      if (course) {
        const allowedIds = [course.teacher, ...course.students];
        filter._id = { $in: allowedIds, $ne: currentUserId };
      } else {
        return res.json({ users: [] });
      }
    }

    const users = await User.find(filter).select(
      "name email role department profilePicture"
    );

    // Map each user to include their last message and unread count
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const lastMsg = await PrivateMessage.findOne({
          $or: [
            { sender: currentUserId, receiver: u._id },
            { sender: u._id, receiver: currentUserId },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await PrivateMessage.countDocuments({
          sender: u._id,
          receiver: currentUserId,
          isRead: false,
        });

        return {
          ...u.toObject(),
          lastMessageTime: lastMsg ? lastMsg.createdAt : null,
          lastMessageContent: lastMsg ? lastMsg.content : null,
          unreadCount,
        };
      })
    );

    // Sort: users with messages first (ordered by lastMessageTime DESC), then others alphabetically
    usersWithStats.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption, targetCourseId } = req.body;

    const originalPost = await CommunityPost.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Flatten nested shares so it shares the original root post directly (FB style)
    const actualPostToShare = originalPost.sharedPostId || originalPost._id;

    const newPost = await CommunityPost.create({
      title: originalPost.title || "Untitled",
      content: caption || "",
      category: originalPost.category || "general",
      author: req.user.uid,
      courseId: targetCourseId || null,
      sharedPostId: actualPostToShare,
    });

    await newPost.populate("author", "name email role profilePicture");
    await newPost.populate({
      path: "sharedPostId",
      populate: [
        { path: "author", select: "name role email" },
        { path: "lecture" }
      ]
    });

    res.status(201).json({ post: newPost });
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, category, removedAttachments } = req.body;

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Only the author can update their post
    if (post.author.toString() !== req.user.uid) {
      return res.status(403).json({ error: "You are not authorized to edit this post" });
    }

    if (title !== undefined) post.title = title || "Untitled";
    if (content !== undefined) post.content = content;
    if (category) post.category = category;

    // Handle file removals
    if (removedAttachments) {
      const toRemove = Array.isArray(removedAttachments) ? removedAttachments : [removedAttachments];
      post.attachments = post.attachments.filter(
        (att) => !toRemove.includes(att.fileUrl) && !toRemove.includes(att._id?.toString())
      );
    }

    // Handle new uploads
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
      post.attachments = [...post.attachments, ...newAttachments];
    }

    await post.save();
    await post.populate("author", "name email role profilePicture");
    if (post.sharedPostId) {
      await post.populate({
        path: "sharedPostId",
        populate: { path: "author", select: "name role email" }
      });
    }

    res.json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Find the post author to check their role
    const postWithAuthor = await CommunityPost.findById(postId).populate("author", "role");
    if (!postWithAuthor) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isAuthor = postWithAuthor.author._id.toString() === req.user.uid;
    const authorRole = postWithAuthor.author.role;

    // Admin can delete anything
    if (req.user.role === "admin") {
      // proceed
    } else if (isAuthor) {
      // Author can delete own post
      // proceed
    } else if (req.user.role === "teacher" && authorRole === "student") {
      // Teacher can delete student posts
      // proceed
    } else {
      return res.status(403).json({ error: "You are not authorized to delete this post" });
    }

    await CommunityPost.findByIdAndDelete(postId);
    await CommunityComment.deleteMany({ postId: postId });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== STUDENT-TEACHER CONTACT REQUESTS ====================

exports.createContactRequest = async (req, res) => {
  try {
    const { teacherId, subject, topic } = req.body;
    const studentId = req.user.uid;

    if (!teacherId || !subject) {
      return res.status(400).json({ error: "Teacher ID and Subject are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(400).json({ error: "Invalid teacher selected" });
    }

    // Check if there is already a pending request
    const existingPending = await ContactRequest.findOne({
      student: studentId,
      teacher: teacherId,
      status: "pending"
    });
    if (existingPending) {
      return res.status(400).json({ error: "You already have a pending contact request for this teacher." });
    }

    const request = await ContactRequest.create({
      student: studentId,
      teacher: teacherId,
      subject,
      topic: topic || ""
    });

    // Notify teacher via system notification & socket
    const studentUser = await User.findById(studentId);
    const studentName = studentUser ? studentUser.name : "A student";
    const io = getIO();

    try {
      await Notification.create({
        userId: teacherId,
        title: `📞 New Contact Request from ${studentName}`,
        message: `Topic: ${subject}`,
        type: "contact_request",
        link: `/community/messages`
      });

      if (io) {
        io.to(`user_${teacherId}`).emit("newNotification", {
          title: `📞 New Contact Request from ${studentName}`,
          message: `Topic: ${subject}`,
          type: "contact_request",
          link: `/community/messages`
        });
        io.to(`user_${teacherId}`).emit("newContactRequest", request);
      }
    } catch (err) {
      console.error("Failed to create request notification:", err);
    }

    res.status(201).json({ message: "Contact request submitted successfully", request });
  } catch (error) {
    console.error("Create contact request error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getContactRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    let query = {};
    if (userRole === "teacher") {
      query = { teacher: userId };
    } else {
      query = { student: userId };
    }

    const requests = await ContactRequest.find(query)
      .populate("student", "name email department profilePicture")
      .populate("teacher", "name email department profilePicture")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error("Get contact requests error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.respondToContactRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, scheduleStart, scheduleEnd } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status response" });
    }

    const request = await ContactRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Contact request not found" });
    }

    if (request.teacher.toString() !== req.user.uid) {
      return res.status(403).json({ error: "You are not authorized to respond to this request" });
    }

    request.status = status;
    if (status === "accepted") {
      if (!scheduleStart || !scheduleEnd) {
        return res.status(400).json({ error: "Start and end times are required to accept a contact request" });
      }
      request.scheduleStart = new Date(scheduleStart);
      request.scheduleEnd = new Date(scheduleEnd);
    }

    await request.save();

    // Notify student
    const teacherUser = await User.findById(req.user.uid);
    const teacherName = teacherUser ? teacherUser.name : "A teacher";
    const io = getIO();

    const title = status === "accepted" 
      ? `✅ Contact Request Approved by ${teacherName}`
      : `❌ Contact Request Declined by ${teacherName}`;
    const msg = status === "accepted"
      ? `Scheduled slot: ${new Date(scheduleStart).toLocaleString()} - ${new Date(scheduleEnd).toLocaleTimeString()}`
      : `Your request regarding "${request.subject}" was declined.`;

    try {
      await Notification.create({
        userId: request.student,
        title,
        message: msg,
        type: "contact_request_response",
        link: `/community/messages`
      });

      if (io) {
        io.to(`user_${request.student}`).emit("newNotification", {
          title,
          message: msg,
          type: "contact_request_response",
          link: `/community/messages`
        });
        io.to(`user_${request.student}`).emit("contactRequestResponse", request);
      }
    } catch (err) {
      console.error("Failed to notify contact request response:", err);
    }

    res.json({ message: `Request ${status} successfully`, request });
  } catch (error) {
    console.error("Respond to contact request error:", error);
    res.status(500).json({ error: error.message });
  }
};
