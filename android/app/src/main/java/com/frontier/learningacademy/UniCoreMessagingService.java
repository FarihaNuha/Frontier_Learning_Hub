package com.frontier.learningacademy;

import com.google.firebase.messaging.RemoteMessage;
import com.capacitorjs.plugins.pushnotifications.MessagingService;

public class UniCoreMessagingService extends MessagingService {
    @Override public void onMessageReceived(RemoteMessage message) {
        if ("true".equals(message.getData().get("nativeHandled"))) {
            UniCoreNotifications.receive(this, message.getData());
        } else super.onMessageReceived(message);
    }
}
