package com.frontier.learningacademy;

final class ChatReplyBoundary {
    private ChatReplyBoundary() {}
    static boolean retain(long timestamp, boolean outgoing, long repliedThrough) {
        return !outgoing && timestamp > repliedThrough;
    }
}
