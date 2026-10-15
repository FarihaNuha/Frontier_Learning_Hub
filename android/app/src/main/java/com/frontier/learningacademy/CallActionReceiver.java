package com.frontier.learningacademy;

import android.content.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class CallActionReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String callId = intent.getStringExtra("callId"), token = intent.getStringExtra("actionToken");
        UniCoreCallNotifications.dismiss(context, callId);
        if (callId == null || token == null || !callId.matches("[a-zA-Z0-9-]+")) return;
        PendingResult pending = goAsync();
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection)new URL("https://frontier-learning-academy.onrender.com/api/community/calls/" + callId + "/decline").openConnection();
                connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(4000); connection.setReadTimeout(4000);
                connection.setRequestProperty("Content-Type", "application/json");
                byte[] body = new JSONObject().put("actionToken", token).toString().getBytes(StandardCharsets.UTF_8);
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body); }
                connection.getResponseCode();
            } catch (Exception ignored) { /* The server's ringing deadline still releases this call offline. */ }
            finally { if (connection != null) connection.disconnect(); pending.finish(); }
        }, "unicore-decline-call").start();
    }
}
