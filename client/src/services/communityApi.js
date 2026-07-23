import api from "./api";

export const communityApi = {
  // Public Community
  getPublicPosts: (params) => api.get("/community/public/posts", { params }),
  getPublicPost: (id) => api.get(`/community/public/posts/${id}`),
  createPublicPost: (data) => api.post("/community/public/posts", data),
  likePublicPost: (id) => api.post(`/community/public/posts/${id}/like`),
  dislikePublicPost: (id) => api.post(`/community/public/posts/${id}/dislike`),
  addPublicComment: (postId, data) =>
    api.post(`/community/public/posts/${postId}/comments`, data),

  // Course-wise Community
  getCoursePosts: (courseId, params) =>
    api.get(`/community/courses/${courseId}/posts`, { params }),
  getCoursePost: (courseId, postId) =>
    api.get(`/community/courses/${courseId}/posts/${postId}`),
  createCoursePost: (courseId, data) =>
    api.post(`/community/courses/${courseId}/posts`, data),
  likeCoursePost: (courseId, postId) =>
    api.post(`/community/courses/${courseId}/posts/${postId}/like`),
  dislikeCoursePost: (courseId, postId) =>
    api.post(`/community/courses/${courseId}/posts/${postId}/dislike`),
  addCourseComment: (courseId, postId, data) =>
    api.post(`/community/courses/${courseId}/posts/${postId}/comments`, data),

  // Share post to feed
  sharePost: (postId, data) => api.post(`/community/posts/${postId}/share`, data),

  // Edit and Delete Post
  updatePost: (postId, data) => api.put(`/community/posts/${postId}`, data),
  deletePost: (postId) => api.delete(`/community/posts/${postId}`),

  // Comments
  likeComment: (id) => api.post(`/community/comments/${id}/like`),
  deleteComment: (id) => api.delete(`/community/comments/${id}`),

  // Private Messages
  getUnreadMessagesCount: () => api.get("/community/messages/unread-count"),
  sendMessage: (data) => api.post("/community/messages", data),
  getInbox: () => api.get("/community/inbox"),
  getConversation: (userId) => api.get(`/community/conversation/${userId}`),
  getUsers: (params) => api.get("/community/users", { params }),
  deleteMessage: (messageId) => api.delete(`/community/messages/${messageId}`),
  toggleReaction: (messageId, emoji) => api.post(`/community/messages/${messageId}/react`, { emoji }),

  // Student-Teacher Contact Requests
  createContactRequest: (data) => api.post("/community/contact-requests", data),
  getContactRequests: () => api.get("/community/contact-requests"),
  respondToContactRequest: (requestId, data) => api.put(`/community/contact-requests/${requestId}/respond`, data),
};

