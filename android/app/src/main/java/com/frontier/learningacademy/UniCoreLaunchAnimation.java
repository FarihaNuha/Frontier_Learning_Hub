package com.frontier.learningacademy;

import android.animation.ValueAnimator;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.splashscreen.SplashScreenViewProvider;
import java.util.function.BooleanSupplier;

/** Uses the supplied wordmark, preserving its exact lettering and gold/navy colors. */
final class UniCoreLaunchAnimation {
    private UniCoreLaunchAnimation() { }

    static void showName(SplashScreenViewProvider provider, long started, BooleanSupplier ready) {
        View splashView = provider.getView();
        if (!(splashView instanceof FrameLayout)
            || (Build.VERSION.SDK_INT >= 26 && !ValueAnimator.areAnimatorsEnabled())) {
            finishWhenReady(provider, started, ready);
            return;
        }
        FrameLayout splash = (FrameLayout) splashView;
        float density = splash.getResources().getDisplayMetrics().density;
        ImageView name = new ImageView(splash.getContext());
        Bitmap reference = BitmapFactory.decodeResource(splash.getResources(), R.drawable.unicore_wordmark);
        // Crop only while displaying: omit the emblem fragment above the supplied name.
        name.setImageBitmap(Bitmap.createBitmap(reference, 42, 28, 313, 66));
        name.setContentDescription(splash.getResources().getString(R.string.app_name));
        name.setScaleType(ImageView.ScaleType.FIT_CENTER);
        name.setAlpha(0f);
        name.setTranslationY(6 * density);
        int width = Math.min(Math.round(340 * density), Math.round(splash.getResources().getDisplayMetrics().widthPixels * 0.8f));
        FrameLayout.LayoutParams layout = new FrameLayout.LayoutParams(width, Math.round(width * 66f / 313f), Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        splash.addView(name, layout);
        splash.post(() -> {
            if (!splash.isAttachedToWindow()) { provider.remove(); return; }
            View icon = provider.getIconView();
            int[] iconPosition = new int[2], splashPosition = new int[2];
            icon.getLocationOnScreen(iconPosition);
            splash.getLocationOnScreen(splashPosition);
            layout.topMargin = Math.max(0, Math.min(
                iconPosition[1] - splashPosition[1] + icon.getHeight() + Math.round(6 * density),
                splash.getHeight() - layout.height - Math.round(20 * density)));
            name.setLayoutParams(layout);
            name.animate().alpha(1f).translationY(0f)
                .setStartDelay(LaunchTiming.nameDelay(SystemClock.elapsedRealtime() - started)).setDuration(240)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> splash.postDelayed(() -> finishWhenReady(provider, started, ready), 2000))
                .start();
        });
    }

    private static void finishWhenReady(SplashScreenViewProvider provider, long started, BooleanSupplier ready) {
        View view = provider.getView();
        if (!view.isAttachedToWindow()) { provider.remove(); return; }
        if (LaunchTiming.canExit(ready.getAsBoolean(), SystemClock.elapsedRealtime() - started)) {
            view.animate().alpha(0f).setDuration(180).withEndAction(provider::remove).start();
        } else {
            view.postDelayed(() -> finishWhenReady(provider, started, ready), 100);
        }
    }
}
