package com.frontier.learningacademy;

import android.animation.ValueAnimator;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.core.splashscreen.SplashScreenViewProvider;

/** Reveals the app name beneath the existing native splash icon. */
final class UniCoreLaunchAnimation {
    private UniCoreLaunchAnimation() { }

    static void showName(SplashScreenViewProvider provider) {
        View splashView = provider.getView();
        if (!(splashView instanceof FrameLayout)) {
            splashView.animate().alpha(0f).setDuration(200).withEndAction(provider::remove).start();
            return;
        }
        FrameLayout splash = (FrameLayout) splashView;
        // Respect the phone's accessibility setting for disabled animations.
        if (Build.VERSION.SDK_INT >= 26 && !ValueAnimator.areAnimatorsEnabled()) {
            provider.remove();
            return;
        }
        float density = splash.getResources().getDisplayMetrics().density;
        TextView name = new TextView(splash.getContext());
        name.setText(R.string.app_name);
        name.setTextSize(30);
        name.setTextColor(Color.rgb(10, 45, 83));
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        name.setLetterSpacing(0.06f);
        name.setGravity(Gravity.CENTER);
        name.setAlpha(0f);
        name.setTranslationY(12 * density);
        FrameLayout.LayoutParams layout = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP);
        splash.addView(name, layout);
        splash.post(() -> {
            if (!splash.isAttachedToWindow()) { provider.remove(); return; }
            View icon = provider.getIconView();
            int[] iconPosition = new int[2], splashPosition = new int[2];
            icon.getLocationOnScreen(iconPosition);
            splash.getLocationOnScreen(splashPosition);
            name.measure(View.MeasureSpec.makeMeasureSpec(splash.getWidth(), View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
            // Follow the actual system icon position in portrait and landscape.
            layout.topMargin = Math.max(0, Math.min(
                iconPosition[1] - splashPosition[1] + icon.getHeight() + Math.round(8 * density),
                splash.getHeight() - name.getMeasuredHeight() - Math.round(24 * density)));
            name.setLayoutParams(layout);
            name.animate().alpha(1f).translationY(0f).setStartDelay(100).setDuration(900)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> splash.animate().alpha(0f).setStartDelay(220).setDuration(200)
                    .withEndAction(provider::remove).start()).start();
        });
    }
}
