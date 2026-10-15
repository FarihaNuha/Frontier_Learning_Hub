package com.frontier.learningacademy;

import android.content.Context;
import androidx.work.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class ChatActionWorker extends Worker {
    public ChatActionWorker(Context context, WorkerParameters params) { super(context, params); }
    @Override public Result doWork() {
        Context context = getApplicationContext(); Data data = getInputData();
        String owner = data.getString("owner"), thread = data.getString("thread"), message = data.getString("messageId");
        if (owner == null || !owner.equals(UniCoreNotifications.prefs(context).getString("owner", ""))) return Result.failure();
        if (message == null || !message.matches("[a-fA-F0-9]{24}")) return Result.failure();
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection)new URL("https://frontier-learning-academy.onrender.com/api/community/messages/" + message + "/notification-action").openConnection();
            connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000); connection.setReadTimeout(45000);
            connection.setRequestProperty("Content-Type", "application/json");
            byte[] body = new JSONObject().put("actionToken", data.getString("token")).put("action", data.getString("action"))
                .put("content", data.getString("content")).put("requestId", data.getString("operation")).toString().getBytes(StandardCharsets.UTF_8);
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body); }
            int status = connection.getResponseCode();
            if (!owner.equals(UniCoreNotifications.prefs(context).getString("owner", ""))) return Result.failure();
            if (status >= 200 && status < 300) {
                UniCoreNotifications.actionComplete(context, thread, data.getString("action"), data.getString("content"), data.getString("operation"));
                return Result.success();
            }
            if (status != 408 && status != 429 && status < 500) {
                UniCoreNotifications.actionStatus(context, thread, "Couldn't send. Open the chat to continue."); return Result.failure();
            }
        } catch (Exception ignored) { /* Retrying uses the same request ID, never duplicate a reply. */ }
        finally { if (connection != null) connection.disconnect(); }
        if (getRunAttemptCount() >= 5) {
            UniCoreNotifications.actionStatus(context, thread, "Couldn't send. Open the chat to continue."); return Result.failure();
        }
        UniCoreNotifications.actionStatus(context, thread, "Waiting for connection. Will retry…");
        return Result.retry();
    }
}
