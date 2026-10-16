package com.frontier.learningacademy;

final class CallTiming {
    private CallTiming() {}
    static long remaining(long expiresAt, long serverTime, long deviceTime) {
        long reference = serverTime > 0 ? serverTime : deviceTime;
        if (expiresAt <= reference) return 0;
        return Math.min(45000, expiresAt - reference);
    }
}
