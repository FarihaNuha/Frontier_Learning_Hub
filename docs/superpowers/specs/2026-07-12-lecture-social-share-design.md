# Lecture Social Share Feature

## Goal
Add a full social sharing modal to lectures in the Student Panel and Teacher Panel, supporting WhatsApp, Messenger, Telegram, Instagram, Email, Community Feed, and copy-link — without changing any other features.

## Changes

### 1. ShareModal.jsx — Add Telegram, Instagram, Email

| Platform | Icon | Behavior |
|----------|------|----------|
| Telegram | `FaTelegram` | `https://t.me/share/url?url=...&text=...` |
| Email | `FaEnvelope` | `mailto:?subject=...&body=...` |
| Instagram | `FaInstagram` | Copy link to clipboard + toast "Link copied! Paste in Instagram" |

The grid stays `repeat(4, 1fr)` — goes from 4 items to 7 items (2 rows).

### 2. ShareModal.jsx — Lecture Support
Add optional props: `lectureId` and `type` ("post" | "lecture").
- When `type="lecture"`, "Share to Feed" calls `api.post(/lectures/share/:id)` instead of `communityApi.sharePost`
- When `type="lecture"`, header shows "Share Lecture" instead of "Share Post"

### 3. StudentDashboard.jsx — Add Share Button
Insert a Share button (FiShare2) between View and Download on each lecture card. Clicking opens the ShareModal with:
- `shareUrl`: lecture view URL with auth token
- `postTitle`: lecture title
- `type="lecture"`, `lectureId: lecture._id`
- `courseId: finalCourseId`

### 4. TeacherDashboard.jsx — Replace Share Modal
Remove the existing inline share modal (lines 1086-1110) and replace it with the full `ShareModal` component. The existing FiShare2 button on each lecture row stays. Props:
- `shareUrl`: lecture view URL with token
- `postTitle`: lecture title
- `type="lecture"`, `lectureId: lecture._id`
- `courseId: courseId`

### 5. CSS
No new CSS. Share modal styles already exist in `community.css`.

## Files Modified
- `client/src/components/ShareModal.jsx` — Add 3 platforms + lecture support
- `client/src/pages/StudentDashboard.jsx` — Add share button + modal
- `client/src/pages/TeacherDashboard.jsx` — Replace inline modal with ShareModal
