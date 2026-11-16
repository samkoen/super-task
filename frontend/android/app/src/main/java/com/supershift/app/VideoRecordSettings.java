package com.supershift.app;

/** Encodage volontairement léger — payloads trop gros cassent CapacitorHttp. */
final class VideoRecordSettings {
    static final int TARGET_BITRATE = 1_000_000;

    private VideoRecordSettings() {}

    static int targetBitrate() {
        return TARGET_BITRATE;
    }
}
