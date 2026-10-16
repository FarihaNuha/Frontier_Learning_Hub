package com.frontier.learningacademy;

import org.junit.Test;
import static org.junit.Assert.*;

public class ChatReplyBoundaryTest {
    @Test public void aReplyStartsANewUnreadBatch() {
        assertFalse(ChatReplyBoundary.retain(100, false, 200));
        assertFalse(ChatReplyBoundary.retain(200, false, 200));
        assertFalse(ChatReplyBoundary.retain(250, true, 200));
        assertTrue(ChatReplyBoundary.retain(300, false, 200));
    }
    @Test public void lateOldPushesCannotReappearAndNewRepliesSurviveRetry() {
        assertFalse(ChatReplyBoundary.retain(150, false, 200));
        assertTrue(ChatReplyBoundary.retain(201, false, 200));
        assertTrue(ChatReplyBoundary.retain(201, false, 200));
    }
}
