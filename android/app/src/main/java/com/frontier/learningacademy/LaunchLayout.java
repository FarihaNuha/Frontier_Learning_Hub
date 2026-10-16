package com.frontier.learningacademy;

final class LaunchLayout {
    final int logoWidth, logoHeight, nameWidth, nameHeight, gap;
    LaunchLayout(int width, int height, float density) {
        logoWidth = Math.max(1, Math.round(Math.min(180 * density, Math.min(width * 0.46f, height * 0.42f))));
        logoHeight = Math.round(logoWidth * 192f / 184f);
        nameWidth = Math.round(logoWidth * 0.80f);
        nameHeight = Math.round(nameWidth * 66f / 313f);
        gap = Math.round(12 * density);
    }
}
