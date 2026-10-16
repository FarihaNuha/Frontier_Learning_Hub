package com.frontier.learningacademy;

import org.junit.Test;
import static org.junit.Assert.*;

public class CallTimingTest {
    @Test public void incorrectDeviceDateDoesNotDiscardIncomingCall() {
        assertEquals(45000, CallTiming.remaining(1045000, 1000000, 9000000000000L));
        assertEquals(45000, CallTiming.remaining(1045000, 1000000, 1));
    }
    @Test public void expiredAndOversizedDurationsAreBounded() {
        assertEquals(0, CallTiming.remaining(999999, 1000000, 1));
        assertEquals(45000, CallTiming.remaining(9999999, 1000000, 1));
        assertEquals(12000, CallTiming.remaining(1012000, 1000000, 1));
    }
}
