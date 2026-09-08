package com.supershift.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class MediaPermissionRequestTest {
    @Test
    public void requestsNothingWhenAlreadyGranted() {
        assertEquals(0, MediaPermissionRequest.aliasesToRequest(true, true, true, true).length);
    }

    @Test
    public void requestsOnlyMissingAliases() {
        assertArrayEquals(
            new String[] {"camera"},
            MediaPermissionRequest.aliasesToRequest(true, false, true, true)
        );
        assertArrayEquals(
            new String[] {"microphone"},
            MediaPermissionRequest.aliasesToRequest(true, true, true, false)
        );
        assertArrayEquals(
            new String[] {"camera", "microphone"},
            MediaPermissionRequest.aliasesToRequest(true, false, true, false)
        );
    }

    @Test
    public void skipsAliasesTheJsDidNotAskFor() {
        assertEquals(0, MediaPermissionRequest.aliasesToRequest(false, false, false, false).length);
        assertArrayEquals(
            new String[] {"camera"},
            MediaPermissionRequest.aliasesToRequest(true, false, false, false)
        );
    }
}
