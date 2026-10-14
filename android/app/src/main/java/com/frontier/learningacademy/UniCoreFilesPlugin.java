package com.frontier.learningacademy;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.print.PrintManager;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "UniCoreFiles")
public class UniCoreFilesPlugin extends Plugin {
    private final ExecutorService fileWorkers = Executors.newFixedThreadPool(2);
    private boolean choosingFile;
    private String fileName(PluginCall call) {
        String name = call.getString("fileName", "document").replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (name.isEmpty() || name.equals(".") || name.equals("..")) name = "document";
        return name.length() > 180 ? name.substring(0, 180) : name;
    }

    private InputStream source(PluginCall call) throws Exception {
        String location = call.getString("url");
        if (location == null) {
            String data = call.getString("data", "");
            if (data.length() > 48 * 1024 * 1024) throw new IllegalArgumentException("Generated file is too large. Export a smaller file.");
            return new ByteArrayInputStream(Base64.decode(data, Base64.DEFAULT));
        }
        URL url = new URL(location);
        // Never send the user's bearer token to a third-party or redirect target.
        if (!"https".equals(url.getProtocol()) ||
            !("frontier-learning-academy.onrender.com".equals(url.getHost()) ||
              "frontier-learning-academy.vercel.app".equals(url.getHost()))) {
            throw new IllegalArgumentException("Only UniCore files can be downloaded here.");
        }
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(30000);
        connection.setReadTimeout(60000);
        String token = call.getString("token");
        if (token != null && "frontier-learning-academy.onrender.com".equals(url.getHost())) {
            connection.setRequestProperty("Authorization", "Bearer " + token);
        }
        int code = connection.getResponseCode();
        if (code != 200) { connection.disconnect(); throw new IllegalStateException("Download failed (HTTP " + code + "). Please try again."); }
        return new java.io.FilterInputStream(connection.getInputStream()) {
            @Override public void close() throws java.io.IOException { try { super.close(); } finally { connection.disconnect(); } }
        };
    }

    private void copy(PluginCall call, OutputStream output) throws Exception {
        try (InputStream input = source(call)) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        }
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        if (choosingFile) { call.reject("Finish choosing a save location first."); return; }
        choosingFile = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, fileName(call));
        try { startActivityForResult(call, intent, "saveResult"); }
        catch (ActivityNotFoundException error) { choosingFile = false; call.reject("This phone has no file picker available."); }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        choosingFile = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        Uri uri = result.getData().getData();
        fileWorkers.execute(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IllegalStateException("The selected location could not be opened.");
                copy(call, output);
                call.resolve(new JSObject().put("cancelled", false));
            } catch (Exception error) {
                try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }
                call.reject(error.getMessage(), error);
            }
        });
    }

    private void cachedFile(PluginCall call, boolean share) {
        fileWorkers.execute(() -> {
            File file = null;
            try {
                File folder = new File(getContext().getCacheDir(), "exports");
                if (!folder.exists() && !folder.mkdirs()) throw new IllegalStateException("Could not prepare the file.");
                File[] old = folder.listFiles();
                if (old != null) for (File entry : old) if (System.currentTimeMillis() - entry.lastModified() > 86400000L) {
                    File[] children = entry.listFiles();
                    if (children != null) for (File child : children) child.delete();
                    entry.delete();
                }
                File temporary = new File(folder, UUID.randomUUID().toString());
                if (!temporary.mkdirs()) throw new IllegalStateException("Could not prepare the file.");
                file = new File(temporary, fileName(call));
                try (OutputStream output = new FileOutputStream(file)) { copy(call, output); }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent intent = new Intent(share ? Intent.ACTION_SEND : Intent.ACTION_VIEW);
                String type = call.getString("mimeType", "application/octet-stream");
                if (share) { intent.setType(type); intent.putExtra(Intent.EXTRA_STREAM, uri); }
                else intent.setDataAndType(uri, type);
                intent.setClipData(ClipData.newRawUri("UniCore file", uri));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().runOnUiThread(() -> {
                    try {
                        getActivity().startActivity(Intent.createChooser(intent, share ? "Share file" : "Open file"));
                        call.resolve();
                    } catch (ActivityNotFoundException error) { call.reject("No app can open this file. Save it instead."); }
                });
            } catch (Exception error) {
                if (file != null) file.delete();
                call.reject(error.getMessage(), error);
            }
        });
    }

    @PluginMethod public void shareFile(PluginCall call) { cachedFile(call, true); }
    @PluginMethod public void openFile(PluginCall call) { cachedFile(call, false); }

    @PluginMethod public void shareText(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_SEND).setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
        intent.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "UniCore"));
        getActivity().startActivity(Intent.createChooser(intent, "Share"));
        call.resolve();
    }

    @PluginMethod public void printPage(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getActivity().getSystemService(android.content.Context.PRINT_SERVICE);
            if (manager == null) { call.reject("Printing is unavailable on this phone."); return; }
            manager.print("UniCore document", getBridge().getWebView().createPrintDocumentAdapter("UniCore document"), null);
            call.resolve();
        });
    }

    @PluginMethod public void notificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        getActivity().startActivity(intent);
        call.resolve();
    }

    @Override protected void handleOnDestroy() { fileWorkers.shutdownNow(); }
}
