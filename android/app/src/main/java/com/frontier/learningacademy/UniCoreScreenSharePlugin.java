package com.frontier.learningacademy;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name = "UniCoreScreenShare")
public class UniCoreScreenSharePlugin extends Plugin {
    private PluginCall pending;
    @PluginMethod public void start(PluginCall call) {
        if (pending != null || ScreenShareService.listener != null) { call.reject("Screen sharing is already starting"); return; }
        pending = call;
        startActivityForResult(call, getContext().getSystemService(MediaProjectionManager.class).createScreenCaptureIntent(), "consent");
    }
    @ActivityCallback private void consent(PluginCall call, ActivityResult result) {
        if (call == null || pending != call) { if (call != null) call.reject("Screen sharing cancelled"); return; }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            pending = null; call.reject("Screen sharing cancelled"); return;
        }
        ScreenShareService.listener = new ScreenShareService.Listener() {
            public void started() { if (pending != null) { pending.resolve(); pending = null; } }
            public void frame(String jpeg, int width, int height) { notifyListeners("frame", new JSObject().put("jpeg", jpeg).put("width", width).put("height", height)); }
            public void stopped(String error) {
                if (pending != null) { pending.reject(error == null ? "Screen sharing stopped" : error); pending = null; }
                notifyListeners("stopped", new JSObject().put("error", error));
            }
        };
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), ScreenShareService.class)
                .putExtra("resultCode", result.getResultCode()).putExtra("consent", result.getData()));
        } catch (Exception error) { ScreenShareService.listener = null; pending = null; call.reject("Could not start screen sharing", error); }
    }
    @PluginMethod public void stop(PluginCall call) { stopCapture(); call.resolve(); }
    @PluginMethod public void frameConsumed(PluginCall call) { ScreenShareService.framePending = false; call.resolve(); }
    private void stopCapture() {
        if (pending != null) { pending.reject("Screen sharing cancelled"); pending = null; }
        getContext().stopService(new Intent(getContext(), ScreenShareService.class));
    }
    @Override protected void handleOnDestroy() { stopCapture(); }
}
