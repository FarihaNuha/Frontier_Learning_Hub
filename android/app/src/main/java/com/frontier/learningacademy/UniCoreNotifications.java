package com.frontier.learningacademy;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Map;

// One renderer for foreground/background FCM. Persist event IDs across process restarts.
final class UniCoreNotifications {
    static android.graphics.Bitmap logo(Context context) {
        return android.graphics.BitmapFactory.decodeResource(context.getResources(), R.drawable.unicore_logo);
    }
    static volatile boolean foreground;
    static volatile String activeThread = "";
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("unicore_notifications", Context.MODE_PRIVATE); }
    static int id(String key) { return key.hashCode() & 0x7fffffff; }
    private static SharedPreferences mutePrefs(Context context) {
        return context.getSharedPreferences("unicore_chat_mutes", Context.MODE_PRIVATE);
    }
    static boolean isMuted(Context context, String thread) {
        String owner = prefs(context).getString("owner", "");
        return !owner.isEmpty() && mutePrefs(context).getBoolean(owner + ":" + thread, false);
    }
    static synchronized void setMuted(Context context, String thread, boolean muted) {
        String owner = prefs(context).getString("owner", "");
        if (owner.isEmpty() || thread.isEmpty()) return;
        // Separate, account-scoped preferences survive app restarts and sign-out.
        SharedPreferences.Editor editor = mutePrefs(context).edit();
        if (muted) editor.putBoolean(owner + ":" + thread, true);
        else editor.remove(owner + ":" + thread);
        editor.apply();
        if (muted) {
            prefs(context).edit().remove("thread:" + thread).apply();
            NotificationManagerCompat.from(context).cancel("chat:" + thread, id(thread));
            androidx.core.content.pm.ShortcutManagerCompat.removeLongLivedShortcuts(context,
                java.util.Collections.singletonList("chat:" + thread));
        }
    }
    static synchronized void account(Context context, String owner) {
        SharedPreferences p = prefs(context);
        if (!owner.equals(p.getString("owner", ""))) {
            NotificationManagerCompat.from(context).cancelAll();
            java.util.List<String> shortcuts = new java.util.ArrayList<>();
            for (String key : p.getAll().keySet()) if (key.startsWith("thread:")) shortcuts.add("chat:" + key.substring(7));
            androidx.core.content.pm.ShortcutManagerCompat.removeLongLivedShortcuts(context, shortcuts);
            p.edit().clear().putString("owner", owner).apply();
            activeThread = "";
        }
    }
    static synchronized void clear(Context context, String thread, long before) {
        try {
            SharedPreferences p = prefs(context);
            long cutoff = Math.max(before, p.getLong("read:" + thread, 0));
            JSONObject history = new JSONObject(p.getString("thread:" + thread, "{}"));
            JSONArray source = history.optJSONArray("messages"), remaining = new JSONArray();
            if (source != null) for (int i = 0; i < source.length(); i++) {
                JSONObject item = source.getJSONObject(i);
                if (ChatReplyBoundary.retain(item.optLong("time"), item.optBoolean("outgoing"), cutoff)) remaining.put(item);
            }
            p.edit().putLong("read:" + thread, cutoff).apply();
            if (remaining.length() == 0) {
                p.edit().remove("thread:" + thread).apply();
                NotificationManagerCompat.from(context).cancel("chat:" + thread, id(thread));
                androidx.core.content.pm.ShortcutManagerCompat.removeLongLivedShortcuts(context, java.util.Collections.singletonList("chat:" + thread));
            } else {
                int unread = 0;
                for (int i = 0; i < remaining.length(); i++) if (!remaining.getJSONObject(i).optBoolean("outgoing")) unread++;
                history.put("messages", remaining).put("count", unread).remove("status");
                p.edit().putString("thread:" + thread, history.toString()).apply();
                renderThread(context, thread, history, false);
            }
        } catch (Exception ignored) { }
    }
    private static PendingIntent tap(Context context, String key, String link) {
        Intent intent = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("unicore://" + link)).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, id(key), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static synchronized void dismiss(Context context, String thread) {
        try {
            JSONObject history = new JSONObject(prefs(context).getString("thread:" + thread, "{}"));
            history.put("dismissed", true);
            prefs(context).edit().putString("thread:" + thread, history.toString()).apply();
            NotificationManagerCompat.from(context).cancel("chat:" + thread, id(thread));
        } catch (Exception ignored) { }
    }
    static synchronized void actionStatus(Context context, String thread, String status) {
        try {
            JSONObject history = new JSONObject(prefs(context).getString("thread:" + thread, "{}"));
            if (!history.has("messages")) return;
            history.put("status", status);
            prefs(context).edit().putString("thread:" + thread, history.toString()).apply();
            if (!history.optBoolean("dismissed")) renderThread(context, thread, history, false);
        } catch (Exception ignored) { }
    }
    static synchronized void actionComplete(Context context, String thread, String action, String text, String operation, long readThrough) {
        try {
            JSONObject history = new JSONObject(prefs(context).getString("thread:" + thread, "{}"));
            JSONArray messages = history.optJSONArray("messages");
            if (messages == null) return;
            if ("reply".equals(action)) {
                NotificationManagerCompat.from(context).cancel("chat:" + thread, id(thread));
                clear(context, thread, readThrough);
                return;
            }
            history.put("status", "like".equals(action) ? "Liked" : "Reply sent");
            prefs(context).edit().putString("thread:" + thread, history.toString()).apply();
            if (!history.optBoolean("dismissed")) renderThread(context, thread, history, false);
        } catch (Exception ignored) { }
    }
    private static PendingIntent action(Context context, String thread, JSONObject history, String action) {
        String messageId = history.optString("messageId");
        Intent intent = new Intent(context, ChatActionReceiver.class).setAction(action)
            .setData(Uri.parse("unicore-chat-action://" + thread + "/" + messageId + "/" + action))
            .putExtra("thread", thread).putExtra("owner", prefs(context).getString("owner", ""))
            .putExtra("messageId", messageId).putExtra("token", history.optString("actionToken"))
            .putExtra("readThrough", history.optLong("actionTime"));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if ("reply".equals(action)) {
            if (android.os.Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
        } else flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, id(thread + action), intent, flags);
    }
    private static void renderThread(Context context, String thread, JSONObject history, boolean alert) throws Exception {
        if (isMuted(context, thread)) return;
        JSONArray messages = history.getJSONArray("messages");
        java.util.List<JSONObject> ordered = new java.util.ArrayList<>();
        for (int i = 0; i < messages.length(); i++) ordered.add(messages.getJSONObject(i));
        ordered.sort((a, b) -> Long.compare(a.optLong("time"), b.optLong("time")));
        Person sender = new Person.Builder().setName(history.optString("sender", "Message")).setKey(thread)
            .setIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(logo(context))).build();
        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(new Person.Builder().setName("You").build());
        style.setGroupConversation(false);
        // Android's MessagingStyle retains at most 25 messages, displayed oldest to newest.
        for (JSONObject item : ordered.subList(Math.max(0, ordered.size() - 25), ordered.size()))
            style.addMessage(item.optString("text"), item.optLong("time"), item.optBoolean("outgoing") ? (Person)null : sender);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "unicore_messages_channel")
            .setSmallIcon(R.drawable.ic_stat_unicore).setLargeIcon(logo(context)).setColor(0xff123463).setContentTitle(history.optString("sender", "Message"))
            .setContentText(ordered.get(ordered.size() - 1).optString("text")).setStyle(style).setRemoteInputHistory(null)
            .setContentIntent(tap(context, thread, history.optString("link", "/community/messages")))
            .setAutoCancel(true).setNumber(history.optInt("count")).setSubText(history.optInt("count") + " unread · " + history.optString("status", "Expand to view messages"))
            .setDeleteIntent(action(context, thread, history, "dismiss"))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setSilent(!alert);
        // Conversation metadata lets Android 11+ recognize this as a chat notification.
        String shortcutId = "chat:" + thread;
        Intent chatIntent = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("unicore://" + history.optString("link", "/community/messages")));
        androidx.core.content.pm.ShortcutInfoCompat shortcut = new androidx.core.content.pm.ShortcutInfoCompat.Builder(context, shortcutId)
            .setShortLabel(history.optString("sender", "Message")).setIntent(chatIntent).setPerson(sender)
            .setLongLived(true).setIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(logo(context))).build();
        androidx.core.content.pm.ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);
        builder.setShortcutId(shortcutId);
        if (!history.optString("actionToken").isEmpty()) {
            androidx.core.app.RemoteInput input = new androidx.core.app.RemoteInput.Builder(ChatActionReceiver.REPLY).setLabel("Reply…").build();
            builder.addAction(new NotificationCompat.Action.Builder(R.drawable.ic_stat_unicore, "Reply", action(context, thread, history, "reply"))
                .addRemoteInput(input).setAllowGeneratedReplies(true).setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY).build());
            builder.addAction(new NotificationCompat.Action.Builder(R.drawable.ic_stat_unicore, "Like", action(context, thread, history, "like"))
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_THUMBS_UP).build());
        }
        builder.addAction(R.drawable.ic_stat_unicore, "Mute", action(context, thread, history, "mute"));
        if (alert) builder.setDefaults(NotificationCompat.DEFAULT_ALL);
        NotificationManagerCompat.from(context).notify("chat:" + thread, id(thread), builder.build());
    }

    static synchronized void receive(Context context, Map<String, String> data) {
        try {
            SharedPreferences p = prefs(context);
            String owner = p.getString("owner", "");
            if (owner.isEmpty() || !owner.equals(data.get("recipientId"))) return;
            if (UniCoreCallNotifications.receive(context, data)) return;
            String thread = data.getOrDefault("threadId", "");
            long time = Long.parseLong(data.getOrDefault("timestamp", String.valueOf(System.currentTimeMillis())));
            if ("chat_read".equals(data.get("type"))) { clear(context, thread, time); return; }
            String event = data.getOrDefault("messageId", data.getOrDefault("notificationId", ""));
            if (event.isEmpty()) return;
            JSONArray seen = new JSONArray(p.getString("seen", "[]"));
            for (int i = 0; i < seen.length(); i++) if (event.equals(seen.getString(i))) return;
            JSONArray recent = new JSONArray();
            for (int i = Math.max(0, seen.length() - 199); i < seen.length(); i++) recent.put(seen.getString(i));
            recent.put(event);
            p.edit().putString("seen", recent.toString()).apply();
            boolean chat = !thread.isEmpty() && "chat_message".equals(data.get("type"));
            if (chat && (isMuted(context, thread) || time <= p.getLong("read:" + thread, 0) || (foreground && thread.equals(activeThread)))) return;
            String link = data.getOrDefault("link", "/notifications");
            if (!link.startsWith("/") || link.startsWith("//") || link.contains("\\")) return;
            String key = chat ? thread : event;
            Intent intent = new Intent(context, MainActivity.class)
                .setAction(Intent.ACTION_VIEW).setData(Uri.parse("unicore://" + link))
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap = PendingIntent.getActivity(context, id(key), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "unicore_messages_channel")
                .setSmallIcon(R.drawable.ic_stat_unicore).setLargeIcon(logo(context)).setColor(0xff123463).setContentTitle(data.getOrDefault("title", "UniCore"))
                .setContentText(data.getOrDefault("body", "")).setContentIntent(tap).setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH).setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            if (chat) {
                JSONObject history = new JSONObject(p.getString("thread:" + thread, "{}"));
                JSONArray messages = history.optJSONArray("messages");
                if (messages == null) messages = new JSONArray();
                messages.put(new JSONObject().put("text", data.getOrDefault("body", "")).put("time", time));
                JSONArray limited = new JSONArray();
                for (int i = Math.max(0, messages.length() - 100); i < messages.length(); i++) limited.put(messages.getJSONObject(i));
                history.put("messages", limited).put("count", history.optInt("count", 0) + 1)
                    .put("sender", data.getOrDefault("senderName", "Message")).put("link", link).put("dismissed", false).remove("status");
                // Late deliveries belong in history but must not change Like/Reply's target.
                if (time >= history.optLong("actionTime")) history.put("actionTime", time).put("messageId", event)
                    .put("actionToken", data.getOrDefault("chatActionToken", ""));
                p.edit().putString("thread:" + thread, history.toString()).apply();
                renderThread(context, thread, history, true);
                return;
            } else builder.setStyle(new NotificationCompat.BigTextStyle().bigText(data.getOrDefault("body", "")));
            if ("incoming_call".equals(data.get("type"))) builder.setCategory(NotificationCompat.CATEGORY_CALL).setTimeoutAfter(45000);
            NotificationManagerCompat.from(context).notify(chat ? "chat:" + thread : event, id(key), builder.build());
        } catch (Exception ignored) { /* Invalid/blocked notifications must not crash the messaging service. */ }
    }
}
