package com.frontier.learningacademy;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import androidx.core.splashscreen.SplashScreenViewProvider;

/** Own the brand layout instead of adding children to Android's managed splash view. */
final class UniCoreLaunchAnimation {
    private UniCoreLaunchAnimation() { }

    static void showName(Activity activity, SplashScreenViewProvider provider) {
        FrameLayout host = activity.findViewById(android.R.id.content);
        if (host == null || (Build.VERSION.SDK_INT >= 26 && !ValueAnimator.areAnimatorsEnabled())) {
            provider.remove();
            return;
        }
        float density = activity.getResources().getDisplayMetrics().density;
        FrameLayout overlay = new FrameLayout(activity);
        overlay.setBackgroundColor(Color.WHITE);
        overlay.setClickable(true);
        LinearLayout brand = new LinearLayout(activity);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.setGravity(Gravity.CENTER_HORIZONTAL);
        Bitmap logoSource = BitmapFactory.decodeResource(activity.getResources(), R.drawable.unicore_logo);
        Bitmap nameSource = BitmapFactory.decodeResource(activity.getResources(), R.drawable.unicore_wordmark);
        ImageView logo = new ImageView(activity);
        // Trim only the source's blank margins; preserve the original emblem.
        logo.setImageBitmap(Bitmap.createBitmap(logoSource, 36, 28, 184, 192));
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription(activity.getString(R.string.app_name));
        ImageView name = new ImageView(activity);
        name.setImageBitmap(Bitmap.createBitmap(nameSource, 42, 28, 313, 66));
        name.setScaleType(ImageView.ScaleType.FIT_CENTER);
        name.setImportantForAccessibility(ImageView.IMPORTANT_FOR_ACCESSIBILITY_NO);
        name.setAlpha(0f);
        name.setTranslationY(14 * density);
        // A single centered vertical group guarantees that the name stays below
        // the emblem, including after Android relayouts the native launch icon.
        overlay.addView(brand, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        int width = host.getWidth() > 0 ? host.getWidth() : activity.getResources().getDisplayMetrics().widthPixels;
        int height = host.getHeight() > 0 ? host.getHeight() : activity.getResources().getDisplayMetrics().heightPixels;
        LaunchLayout layout = new LaunchLayout(width, height, density);
        brand.addView(logo, new LinearLayout.LayoutParams(layout.logoWidth, layout.logoHeight));
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(layout.nameWidth, layout.nameHeight);
        nameParams.topMargin = layout.gap;
        brand.addView(name, nameParams);
        logo.setTranslationY((layout.gap + layout.nameHeight) / 2f);
        host.addView(overlay, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        provider.remove();
        overlay.post(() -> {
            if (!overlay.isAttachedToWindow()) return;
            logo.animate().translationY(0f).setDuration(LaunchTiming.REVEAL_MS)
                .setInterpolator(new DecelerateInterpolator()).start();
            name.animate().alpha(1f).translationY(0f).setDuration(LaunchTiming.REVEAL_MS)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> overlay.animate().alpha(0f).setStartDelay(LaunchTiming.HOLD_MS)
                    .setDuration(LaunchTiming.FADE_MS).withEndAction(() -> host.removeView(overlay)).start())
                .start();
        });
    }
}
