package com.frontier.learningacademy;

import org.junit.Test;
import static org.junit.Assert.*;

public class LaunchTimingTest {
    @Test public void nameRevealsImmediatelyThenHoldsForOnlyOneSecond() {
        assertEquals(1000, LaunchTiming.HOLD_MS);
        assertTrue(LaunchTiming.REVEAL_MS + LaunchTiming.HOLD_MS + LaunchTiming.FADE_MS <= 1500);
    }
    @Test public void wordmarkIsSmallerThanLogoAndWholeGroupFitsNarrowAndLandscapeScreens() {
        for (int[] screen : new int[][] { {360, 800}, {320, 640}, {640, 320}, {240, 160} }) {
            LaunchLayout layout = new LaunchLayout(screen[0], screen[1], 1);
            assertTrue(layout.nameWidth < layout.logoWidth);
            assertTrue(layout.gap > 0);
            assertTrue(layout.logoHeight + layout.gap + layout.nameHeight < screen[1]);
            assertTrue(layout.logoWidth < screen[0]);
        }
    }
}
