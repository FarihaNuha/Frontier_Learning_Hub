package com.frontier.learningacademy;

import android.app.*;
import android.content.*;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import java.util.Map;

final class UniCoreCallNotifications {
    static final String CHANNEL = "unicore_incoming_calls_v1";
    static final String CLOSED = "com.frontier.learningacademy.CALL_CLOSED";
    static volatile String visibleCall = "";
    static void channels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Incoming calls", NotificationManager.IMPORTANCE_HIGH);
        channel.enableVibration(true);
        channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build());
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    static Intent intent(Context context, Class<?> target, Map<String, String> data, String action) {
        Intent intent = new Intent(context, target).setAction(action)
            .setData(Uri.parse("unicore-call://" + data.get("callId") + "/" + action));
        for (String key : new String[]{"callId", "callerName", "callerId", "callType", "expiresAt", "actionToken", "recipientId"})
            intent.putExtra(key, data.get(key));
        return intent;
    }
    static synchronized void dismiss(Context context, String callId) {
        if (callId == null || callId.isEmpty()) return;
        // A delayed ringing push must not resurrect an answered/ended call.
        android.content.SharedPreferences p = UniCoreNotifications.prefs(context);
        android.content.SharedPreferences.Editor edit = p.edit();
        long now = System.currentTimeMillis();
        for (Map.Entry<String, ?> item : p.getAll().entrySet())
            if (item.getKey().startsWith("closed:") && item.getValue() instanceof Long && now - (Long)item.getValue() > 120000) edit.remove(item.getKey());
        edit.putLong("closed:" + callId, now).apply();
        NotificationManagerCompat.from(context).cancel("call:" + callId, UniCoreNotifications.id(callId));
        context.sendBroadcast(new Intent(CLOSED).setPackage(context.getPackageName()).putExtra("callId", callId));
    }
    static boolean receive(Context context, Map<String, String> data) {
        String type = data.get("type");
        if (!"incoming_call".equals(type) && !"call_ended".equals(type)) return false;
        String callId = data.get("callId");
        if (callId == null || callId.isEmpty()) return true;
        if ("call_ended".equals(type)) { dismiss(context, callId); return true; }
        try {
            long remaining = Long.parseLong(data.getOrDefault("expiresAt", "0")) - System.currentTimeMillis();
            if (remaining <= 0 || UniCoreNotifications.prefs(context).contains("closed:" + callId)) return true;
            if (UniCoreNotifications.foreground && callId.equals(visibleCall)) return true;
            channels(context);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
            PendingIntent screen = PendingIntent.getActivity(context, 0,
                intent(context, IncomingCallActivity.class, data, "ring"), flags);
            PendingIntent answer = PendingIntent.getActivity(context, 0,
                intent(context, MainActivity.class, data, "answer").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP), flags);
            PendingIntent decline = PendingIntent.getBroadcast(context, 0,
                intent(context, CallActionReceiver.class, data, "decline"), flags);
            Person caller = new Person.Builder().setName(data.getOrDefault("callerName", "UniCore caller")).setImportant(true).build();
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_unicore).setContentTitle(caller.getName())
                .setContentText("Incoming " + data.getOrDefault("callType", "audio") + " call")
                .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer))
                .setCategory(NotificationCompat.CATEGORY_CALL).setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setContentIntent(screen)
                .setFullScreenIntent(screen, true).setOngoing(true).setAutoCancel(false)
                .setOnlyAlertOnce(true).setTimeoutAfter(Math.min(remaining, 45000));
            Notification notification = builder.build();
            notification.flags |= Notification.FLAG_INSISTENT;
            NotificationManagerCompat.from(context).notify("call:" + callId, UniCoreNotifications.id(callId), notification);
        } catch (Exception ignored) { }
        return true;
    }
}
