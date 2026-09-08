package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NativeCaptureOutcomeTest {
    @Test
    public void cancelsWhenActivityDidNotSucceed() {
        NativeCaptureOutcome outcome = NativeCaptureOutcome.fromActivity(false, "/cache/a.mp4", 8);
        assertTrue(outcome.cancelled);
        assertNull(outcome.path);
        assertEquals(0, outcome.durationSeconds);
    }

    @Test
    public void cancelsWhenPathIsMissing() {
        assertTrue(NativeCaptureOutcome.fromActivity(true, null, 3).cancelled);
        assertTrue(NativeCaptureOutcome.fromActivity(true, "", 3).cancelled);
    }

    @Test
    public void keepsPathAndDurationOnSuccess() {
        NativeCaptureOutcome outcome = NativeCaptureOutcome.fromActivity(true, "/cache/a.mp4", 8);
        assertFalse(outcome.cancelled);
        assertEquals("/cache/a.mp4", outcome.path);
        assertEquals(8, outcome.durationSeconds);
    }
}
