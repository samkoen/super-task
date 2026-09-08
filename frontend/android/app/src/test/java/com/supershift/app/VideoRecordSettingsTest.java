package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class VideoRecordSettingsTest {
    @Test
    public void keepsBitrateUnderVercelBodyLimitForTypicalClips() {
        assertEquals(1_000_000, VideoRecordSettings.targetBitrate());
        assertTrue(VideoRecordSettings.targetBitrate() <= 1_200_000);
    }
}
