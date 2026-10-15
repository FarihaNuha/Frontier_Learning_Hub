package com.frontier.learningacademy;

import android.app.Activity;
import android.content.*;
import android.graphics.Color;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.core.content.ContextCompat;

public class IncomingCallActivity extends Activity {
    private final Handler timer = new Handler(Looper.getMainLooper());
    private final BroadcastReceiver closed = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            if (i.getStringExtra("callId").equals(getIntent().getStringExtra("callId"))) finish();
        }
    };
    private boolean registered;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        String callId = getIntent().getStringExtra("callId");
        long expires;
        try { expires = Long.parseLong(getIntent().getStringExtra("expiresAt")); }
        catch (Exception error) { finish(); return; }
        if (expires <= System.currentTimeMillis() || UniCoreNotifications.prefs(this).contains("closed:" + callId)) { finish(); return; }
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL); layout.setGravity(Gravity.CENTER); layout.setPadding(40, 40, 40, 40);
        layout.setBackgroundColor(Color.rgb(16, 43, 62));
        TextView caller = new TextView(this); caller.setText(getIntent().getStringExtra("callerName")); caller.setTextSize(30); caller.setTextColor(Color.WHITE);
        TextView label = new TextView(this); label.setText("Incoming " + getIntent().getStringExtra("callType") + " call"); label.setTextSize(18); label.setTextColor(Color.WHITE); label.setPadding(0, 24, 0, 50);
        layout.addView(caller); layout.addView(label);
        Button answer = new Button(this); answer.setText("Answer");
        answer.setOnClickListener(v -> {
            Intent open = new Intent(this, MainActivity.class).setAction("answer").putExtras(getIntent())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(open); finish();
        });
        Button decline = new Button(this); decline.setText("Decline");
        decline.setOnClickListener(v -> { sendBroadcast(new Intent(this, CallActionReceiver.class).setAction("decline").putExtras(getIntent())); finish(); });
        layout.addView(answer); layout.addView(decline); setContentView(layout);
        ContextCompat.registerReceiver(this, closed, new IntentFilter(UniCoreCallNotifications.CLOSED), ContextCompat.RECEIVER_NOT_EXPORTED); registered = true;
        timer.postDelayed(this::finish, Math.min(expires - System.currentTimeMillis(), 45000));
    }
    @Override protected void onDestroy() { timer.removeCallbacksAndMessages(null); if (registered) unregisterReceiver(closed); super.onDestroy(); }
}
