package com.frontier.learningacademy;

import android.content.*;
import android.os.Bundle;
import androidx.core.app.RemoteInput;
import androidx.work.*;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

public class ChatActionReceiver extends BroadcastReceiver {
    static final String REPLY = "unicore_reply";
    @Override public void onReceive(Context context, Intent intent) {
        String thread = intent.getStringExtra("thread"), owner = intent.getStringExtra("owner");
        if (thread == null || owner == null || !owner.equals(UniCoreNotifications.prefs(context).getString("owner", ""))) return;
        String action = intent.getAction();
        if ("mute".equals(action)) { UniCoreNotifications.setMuted(context, thread, true); return; }
        if ("dismiss".equals(action)) { UniCoreNotifications.dismiss(context, thread); return; }
        if (!"reply".equals(action) && !"like".equals(action)) return;
        String messageId = intent.getStringExtra("messageId"), token = intent.getStringExtra("token");
        if (messageId == null || token == null) return;
        Bundle results = RemoteInput.getResultsFromIntent(intent);
        String reply = results == null ? "" : String.valueOf(results.getCharSequence(REPLY, "")).trim();
        if ("reply".equals(action) && (reply.isEmpty() || reply.length() > 1000)) {
            UniCoreNotifications.actionStatus(context, thread, "Reply must contain 1–1000 characters"); return;
        }
        String operation = UUID.randomUUID().toString();
        Data data = new Data.Builder().putString("thread", thread).putString("owner", owner)
            .putString("messageId", messageId).putString("token", token).putString("action", action)
            .putString("content", reply).putString("operation", operation)
            .putLong("readThrough", intent.getLongExtra("readThrough", replyBoundary(context, thread))).build();
        OneTimeWorkRequest work = new OneTimeWorkRequest.Builder(ChatActionWorker.class).setInputData(data)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build();
        WorkManager.getInstance(context).enqueueUniqueWork("chat-action:" + operation, ExistingWorkPolicy.KEEP, work);
        UniCoreNotifications.actionStatus(context, thread, "reply".equals(action) ? "Sending reply…" : "Sending Like…");
    }
    private static long replyBoundary(Context context, String thread) {
        try { return new org.json.JSONObject(UniCoreNotifications.prefs(context).getString("thread:" + thread, "{}")).optLong("actionTime"); }
        catch (Exception ignored) { return 0; }
    }

}
