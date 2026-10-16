package com.frontier.learningacademy;

final class LaunchTiming {
    private LaunchTiming() { }
    static long nameDelay(long elapsed) { return Math.max(0, 1000 - elapsed); }
    // An unreachable backend or broken page must never trap the user indefinitely.
    static boolean canExit(boolean ready, long elapsed) { return ready || elapsed >= 8000; }
}
