package com.frontier.learningacademy;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UniCoreCalls")
public class UniCoreCallsPlugin extends Plugin {
    private JSObject pendingAction;
    @Override public void load() { handleOnNewIntent(getActivity().getIntent()); }
    @Override protected void handleOnNewIntent(Intent intent) {
        if (!"answer".equals(intent.getAction())) return;
        String callId = intent.getStringExtra("callId");
        String owner = UniCoreNotifications.prefs(getContext()).getString("owner", "");
        if (callId == null || owner.isEmpty() || !owner.equals(intent.getStringExtra("recipientId"))) return;
        if (UniCoreCallNotifications.remaining(getContext(), callId, intent.getStringExtra("expiresAt")) <= 0) return;
        pendingAction = new JSObject().put("callId", callId).put("action", "answer").put("recipientId", owner);
        intent.setAction(Intent.ACTION_MAIN);
        UniCoreCallNotifications.dismiss(getContext(), callId);
        notifyListeners("callAction", pendingAction);
    }
    @PluginMethod public void takeAction(PluginCall call) {
        call.resolve(pendingAction == null ? new JSObject() : pendingAction); pendingAction = null;
    }
    @PluginMethod public void dismiss(PluginCall call) { UniCoreCallNotifications.dismiss(getContext(), call.getString("callId", "")); call.resolve(); }
    @PluginMethod public void visible(PluginCall call) { UniCoreCallNotifications.visibleCall = call.getString("callId", ""); call.resolve(); }
    @PluginMethod public void settings(PluginCall call) {
        Intent intent = Build.VERSION.SDK_INT >= 34
            ? new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getContext().getPackageName()))
            : new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        getActivity().startActivity(intent); call.resolve();
    }
    @PluginMethod public void status(PluginCall call) {
        boolean allowed = Build.VERSION.SDK_INT < 34 || getContext().getSystemService(NotificationManager.class).canUseFullScreenIntent();
        call.resolve(new JSObject().put("fullScreenAllowed", allowed));
    }
}
