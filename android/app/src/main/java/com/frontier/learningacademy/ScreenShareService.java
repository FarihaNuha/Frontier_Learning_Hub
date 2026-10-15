package com.frontier.learningacademy;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.*;
import android.media.projection.*;
import android.os.*;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;

// Bounded 6 fps, 960px capture feeds the existing encrypted WebRTC video track.
// No frames are saved to disk or sent through the application server.
public class ScreenShareService extends Service {
    interface Listener { void started(); void frame(String jpeg, int width, int height); void stopped(String error); }
    static volatile Listener listener;
    static volatile boolean framePending;
    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private HandlerThread worker;
    private Handler handler;
    private PowerManager.WakeLock wake;
    private long lastFrame;
    private int width, height, density;
    private String failure;
    private final MediaProjection.Callback callback = new MediaProjection.Callback() {
        @Override public void onStop() { stopSelf(); }
        @Override public void onCapturedContentResize(int w, int h) { if (display != null) resize(w, h); }
    };
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || "stop".equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        if (projection != null) return START_NOT_STICKY;
        try {
            if (Build.VERSION.SDK_INT >= 26) getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel("unicore_screen_share", "Screen sharing", NotificationManager.IMPORTANCE_LOW));
            PendingIntent stop = PendingIntent.getService(this, 0, new Intent(this, ScreenShareService.class).setAction("stop"), PendingIntent.FLAG_IMMUTABLE);
            Notification notification = new NotificationCompat.Builder(this, "unicore_screen_share")
                .setSmallIcon(R.drawable.ic_stat_unicore).setContentTitle("You are sharing your screen")
                .setContentText("Return to UniCore or tap Stop sharing to finish.").setOngoing(true)
                .setContentIntent(PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE))
                .addAction(R.drawable.ic_stat_unicore, "Stop sharing", stop).build();
            if (Build.VERSION.SDK_INT >= 29) startForeground(7401, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            else startForeground(7401, notification);
            worker = new HandlerThread("unicore-screen-capture"); worker.start(); handler = new Handler(worker.getLooper());
            wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "UniCore:ScreenShare"); wake.acquire(2 * 60 * 60 * 1000L);
            Intent consent = intent.getParcelableExtra("consent");
            projection = getSystemService(MediaProjectionManager.class).getMediaProjection(intent.getIntExtra("resultCode", 0), consent);
            projection.registerCallback(callback, handler);
            DisplayMetrics metrics = new DisplayMetrics();
            getSystemService(WindowManager.class).getDefaultDisplay().getRealMetrics(metrics); density = metrics.densityDpi;
            dimensions(metrics.widthPixels, metrics.heightPixels);
            reader = makeReader(); framePending = false;
            display = projection.createVirtualDisplay("UniCore screen", width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader.getSurface(), null, handler);
            if (listener != null) listener.started();
        } catch (Exception error) { failure = "Screen capture failed. Try sharing again."; stopSelf(); }
        return START_NOT_STICKY;
    }
    private void dimensions(int w, int h) {
        double scale = Math.min(1.0, 960.0 / Math.max(w, h));
        width = Math.max(2, (int)(w * scale) / 2 * 2); height = Math.max(2, (int)(h * scale) / 2 * 2);
    }
    private void resize(int w, int h) {
        int oldWidth = width, oldHeight = height; dimensions(w, h);
        if (oldWidth == width && oldHeight == height) return;
        ImageReader old = reader; reader = makeReader();
        display.resize(width, height, density); display.setSurface(reader.getSurface()); old.close();
    }
    private ImageReader makeReader() {
        ImageReader source = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        source.setOnImageAvailableListener(this::capture, handler); return source;
    }
    private void capture(ImageReader source) {
        try (Image image = source.acquireLatestImage()) {
            long now = SystemClock.elapsedRealtime();
            if (image == null || listener == null || now - lastFrame < 166 || (framePending && now - lastFrame < 2000)) return;
            lastFrame = now; framePending = true;
            Image.Plane plane = image.getPlanes()[0];
            int w = image.getWidth(), h = image.getHeight();
            int paddedWidth = w + (plane.getRowStride() - plane.getPixelStride() * w) / plane.getPixelStride();
            Bitmap padded = Bitmap.createBitmap(paddedWidth, h, Bitmap.Config.ARGB_8888); padded.copyPixelsFromBuffer(plane.getBuffer());
            Bitmap frame = Bitmap.createBitmap(padded, 0, 0, w, h);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(); frame.compress(Bitmap.CompressFormat.JPEG, 70, bytes);
            if (frame != padded) frame.recycle(); padded.recycle();
            Listener sink = listener;
            if (sink != null) sink.frame(Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP), w, h);
        } catch (Exception error) { framePending = false; }
    }
    @Override public void onDestroy() {
        // Release on the same thread as frame/resize callbacks to avoid closing a surface in use.
        Handler captureHandler = handler;
        Runnable release = () -> {
            if (display != null) { display.release(); display = null; }
            if (reader != null) { reader.close(); reader = null; }
            if (projection != null) { projection.unregisterCallback(callback); projection.stop(); projection = null; }
            if (wake != null && wake.isHeld()) wake.release();
            Listener sink = listener; listener = null; framePending = false;
            if (sink != null) sink.stopped(failure);
            if (worker != null) worker.quitSafely();
        };
        if (captureHandler != null) captureHandler.post(release); else release.run();
        stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy();
    }
}
