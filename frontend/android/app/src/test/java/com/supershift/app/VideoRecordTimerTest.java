package com.supershift.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class VideoRecordTimerTest {
    @Test
    public void showsElapsedOverRequiredWhenMinimumExists() {
        assertEquals("1 / 5", VideoRecordTimer.progressLabel(1, 5));
        assertEquals("2 / 5", VideoRecordTimer.progressLabel(2, 5));
    }

    @Test
    public void showsOnlyElapsedWhenThereIsNoMinimum() {
        assertEquals("2", VideoRecordTimer.progressLabel(2, 0));
        assertEquals("0", VideoRecordTimer.progressLabel(-1, 0));
    }
}
