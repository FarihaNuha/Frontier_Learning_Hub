# Messaging File Sharing & Community Feed Title Removal

## Overview

Two features for the UFTB Moodle Community section:
1. Add WhatsApp/Messenger-like file attachment support to private messages
2. Remove the required Title field from community post creation (Facebook-style)

---

## Feature 1: Messages File Sharing

### Goal
Allow users to send images, audio, video, documents (PDF, DOCX, PPT, etc.) and any file type through private messages — similar to WhatsApp/Messenger.

### Server Changes

**Model** — `server/models/PrivateMessage.js`
- No changes needed — `attachments: [{ fileName, fileUrl, fileType }]` already defined

**Routes** — `server/routes/communityRoutes.js`
- Line 58: Add `upload.array("files")` middleware to `POST /messages`
- Before: `router.post("/messages", verifyToken, ctrl.sendMessage);`
- After: `router.post("/messages", verifyToken, upload.array("files"), ctrl.sendMessage);`

**Controller** — `server/controllers/communityController.js` — `sendMessage`
- Accept optional `req.files` (from multer)
- Map files to `attachments` array: `{ fileName, fileUrl, fileType }`
- Make `content` optional if `files` are present (a message can be just files)
- Save attachments to PrivateMessage document
- Socket.io emission already sends full message object — no changes needed

### Client Changes

**MessagePage.jsx**
1. Add a `+` attachment button next to the message input
2. On click → show an attachment picker popup/modal with options:
   - 📷 **Gallery** — `<input type="file" accept="image/*" multiple>`
   - 📄 **Document** — `<input accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.zip,.rar,.txt,..." multiple>`
   - 📸 **Camera** — `<input capture="environment" accept="image/*">`
   - 🎤 **Audio** — `<input accept="audio/*">` + optional MediaRecorder for voice recording
3. Pre-send: show selected file previews/chips below the input with remove buttons
4. `handleSendMessage` → use `FormData` to send both text content and files
5. Display attachments in chat bubbles:
   - **Images:** inline `<img>` with max-width, rounded corners
   - **Videos:** `<video>` player with controls
   - **Audio:** `<audio>` player with controls
   - **Documents:** file card with icon, filename, type, and download link
6. Remove the Subject field from the chat area input (currently used in new message form, but subject is redundant for WhatsApp-style chat)

**CSS** — `client/src/styles/community.css`
- Attachment picker popup styles
- File preview chip styles
- Image/video/audio/document display in message bubbles

### Socket.io Impact
- No changes needed. `newPrivateMessage` event already emits the full message including attachments.

---

## Feature 2: Remove Title from Community Post Creation

### Goal
Allow users to create posts without a title — just content + optional attachments, like Facebook posts.

### Server Changes

**Model** — `server/models/CommunityPost.js`
- Remove `required: true` from `title` field
- Add `default: "Untitled"` for backwards compatibility

**Controller** — `server/controllers/communityController.js`
- `createPublicPost`: Remove title from required validation. Auto-set title to "Untitled" if empty.
- `createCoursePost`: Same change.
- `updatePost`: Make title optional in update logic.
- `sharePost`: Same treatment for shared posts.

### Client Changes

**CommunityHub.jsx** — `CreatePostModal`
- Remove the Title `<input>` and its `<label>` (lines 911-919)
- Remove `title` from FormData in `handleSubmit`
- Remove `title` from form validation check

**CourseCommunity.jsx** — Create Post Form
- Remove the Title `<input>` and its `<label>` (lines 320-331)
- Remove `title` from `newPost` state, `handleCreatePost` FormData, and validation

**EditPostModal** (in both CommunityHub.jsx and CourseCommunity.jsx)
- Remove the Title `<input>`

**Post Cards** (PostCard, CoursePostCard, post detail pages)
- Conditionally render `.post-title` only if title is not "Untitled" or not empty
- Don't show empty title heading

**communityApi.js** and all API calls
- No changes needed — title is simply not sent in the request

---

## Files Changed Summary

| File | Change |
|------|--------|
| `server/models/CommunityPost.js` | Make title optional, add default |
| `server/models/PrivateMessage.js` | No change needed |
| `server/routes/communityRoutes.js` | Add upload middleware to sendMessage |
| `server/controllers/communityController.js` | Handle files in sendMessage; make title optional in post creation/update |
| `client/src/pages/MessagePage.jsx` | Add file picker, FormData sending, attachment display |
| `client/src/pages/CommunityHub.jsx` | Remove title from CreatePostModal & EditPostModal |
| `client/src/pages/CourseCommunity.jsx` | Remove title from create form & EditPostModal |
| `client/src/styles/community.css` | Add message attachment styles |
