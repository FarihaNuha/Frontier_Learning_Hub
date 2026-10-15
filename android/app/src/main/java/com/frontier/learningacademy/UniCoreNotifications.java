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
    static volatile boolean foreground;
    static volatile String activeThread = "";
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("unicore_notifications", Context.MODE_PRIVATE); }
    static int id(String key) { return key.hashCode() & 0x7fffffff; }
    static synchronized void account(Context context, String owner) {
        SharedPreferences p = prefs(context);
        if (!owner.equals(p.getString("owner", ""))) {
            NotificationManagerCompat.from(context).cancelAll();
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
                if (item.optLong("time") > cutoff) remaining.put(item);
            }
            p.edit().putLong("read:" + thread, cutoff).apply();
            if (remaining.length() == 0) {
                p.edit().remove("thread:" + thread).apply();
                NotificationManagerCompat.from(context).cancel("chat:" + thread, id(thread));
            } else {
                history.put("messages", remaining).put("count", remaining.length());
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
    private static void renderThread(Context context, String thread, JSONObject history, boolean alert) throws Exception {
        JSONArray messages = history.getJSONArray("messages");
        java.util.List<JSONObject> ordered = new java.util.ArrayList<>();
        for (int i = 0; i < messages.length(); i++) ordered.add(messages.getJSONObject(i));
        ordered.sort((a, b) -> Long.compare(a.optLong("time"), b.optLong("time")));
        Person sender = new Person.Builder().setName(history.optString("sender", "Message")).setKey(thread).build();
        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(new Person.Builder().setName("You").build());
        for (JSONObject item : ordered) style.addMessage(item.optString("text"), item.optLong("time"), sender);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "unicore_messages_channel")
            .setSmallIcon(R.drawable.ic_stat_unicore).setContentTitle(history.optString("sender", "Message"))
            .setContentText(ordered.get(ordered.size() - 1).optString("text")).setStyle(style)
            .setContentIntent(tap(context, thread, history.optString("link", "/community/messages")))
            .setAutoCancel(true).setNumber(history.optInt("count")).setSubText(history.optInt("count") + " unread messages")
            .setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setSilent(!alert);
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
            if (chat && (time <= p.getLong("read:" + thread, 0) || (foreground && thread.equals(activeThread)))) return;
            String link = data.getOrDefault("link", "/notifications");
            if (!link.startsWith("/") || link.startsWith("//") || link.contains("\\")) return;
            String key = chat ? thread : event;
            Intent intent = new Intent(context, MainActivity.class)
                .setAction(Intent.ACTION_VIEW).setData(Uri.parse("unicore://" + link))
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap = PendingIntent.getActivity(context, id(key), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "unicore_messages_channel")
                .setSmallIcon(R.drawable.ic_stat_unicore).setContentTitle(data.getOrDefault("title", "UniCore"))
                .setContentText(data.getOrDefault("body", "")).setContentIntent(tap).setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH).setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            if (chat) {
                JSONObject history = new JSONObject(p.getString("thread:" + thread, "{}"));
                JSONArray messages = history.optJSONArray("messages");
                if (messages == null) messages = new JSONArray();
                messages.put(new JSONObject().put("text", data.getOrDefault("body", "")).put("time", time));
                JSONArray limited = new JSONArray();
                for (int i = Math.max(0, messages.length() - 20); i < messages.length(); i++) limited.put(messages.getJSONObject(i));
                history.put("messages", limited).put("count", history.optInt("count", 0) + 1)
                    .put("sender", data.getOrDefault("senderName", "Message")).put("link", link);
                p.edit().putString("thread:" + thread, history.toString()).apply();
                renderThread(context, thread, history, true);
                return;
            } else builder.setStyle(new NotificationCompat.BigTextStyle().bigText(data.getOrDefault("body", "")));
            if ("incoming_call".equals(data.get("type"))) builder.setCategory(NotificationCompat.CATEGORY_CALL).setTimeoutAfter(45000);
            NotificationManagerCompat.from(context).notify(chat ? "chat:" + thread : event, id(key), builder.build());
        } catch (Exception ignored) { /* Invalid/blocked notifications must not crash the messaging service. */ }
    }
}
