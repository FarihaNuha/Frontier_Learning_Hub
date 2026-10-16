package com.frontier.learningacademy;

import org.junit.Test;
import static org.junit.Assert.*;

public class LaunchTimingTest {
    @Test public void nameAppearsOneSecondFromLaunchWithoutRepeatingElapsedTime() {
        assertEquals(1000, LaunchTiming.nameDelay(0));
        assertEquals(600, LaunchTiming.nameDelay(400));
        assertEquals(0, LaunchTiming.nameDelay(1700));
    }
    @Test public void waitForTheMainScreenButAllowAnOfflineTimeout() {
        assertFalse(LaunchTiming.canExit(false, 3300));
        assertTrue(LaunchTiming.canExit(true, 3300));
        assertTrue(LaunchTiming.canExit(false, 8000));
    }
}
