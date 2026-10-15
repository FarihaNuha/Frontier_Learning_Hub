package com.frontier.learningacademy;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UniCoreNotifications")
public class UniCoreNotificationsPlugin extends Plugin {
    @PluginMethod public void capabilities(PluginCall call) { JSObject result = new JSObject(); result.put("mode", "native-v2"); call.resolve(result); }
    @PluginMethod public void setContext(PluginCall call) {
        UniCoreNotifications.account(getContext(), call.getString("userId", ""));
        String thread = call.getString("threadId");
        if (thread != null) UniCoreNotifications.activeThread = thread;
        call.resolve();
    }
    @PluginMethod public void clearThread(PluginCall call) {
        UniCoreNotifications.clear(getContext(), call.getString("threadId", ""), call.getLong("before", 0L));
        call.resolve();
    }
}
