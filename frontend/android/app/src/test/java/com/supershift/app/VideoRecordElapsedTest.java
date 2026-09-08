package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class VideoRecordElapsedTest {
    @Test
    public void sumsCompletedAndCurrentSegment() {
        assertEquals(5, VideoRecordElapsed.seconds(4000, 1000, 2000));
        assertEquals(4, VideoRecordElapsed.seconds(4000, 0, 99999));
    }

    @Test
    public void neverGoesNegative() {
        assertEquals(0, VideoRecordElapsed.seconds(0, 5000, 1000));
    }

    @Test
    public void blocksFinishBeforeMinimum() {
        assertTrue(VideoRecordElapsed.tooShortToFinish(5, 4));
        assertFalse(VideoRecordElapsed.tooShortToFinish(5, 5));
        assertFalse(VideoRecordElapsed.tooShortToFinish(0, 1));
    }
}
