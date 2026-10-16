package com.frontier.learningacademy;

import android.os.Bundle;
import android.os.Build;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        // Prepare the WebView under a short, fixed-duration brand transition.
        splash.setOnExitAnimationListener(provider -> UniCoreLaunchAnimation.showName(this, provider));
        registerPlugin(UniCoreFilesPlugin.class);
        registerPlugin(UniCoreNotificationsPlugin.class);
        registerPlugin(UniCoreCallsPlugin.class);
        registerPlugin(UniCoreScreenSharePlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        UniCoreCallNotifications.channels(this);
        configureWebView();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "unicore_messages_channel", "UniCore notifications", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Messages, calls, posts, lectures, assignments and exams");
            channel.enableVibration(true);
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
    }

    private void configureWebView() {
        try {
            WebView webView = this.getBridge() != null ? this.getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override public void onResume() { super.onResume(); UniCoreNotifications.foreground = true; }
    @Override public void onPause() { UniCoreNotifications.foreground = false; super.onPause(); }
}
