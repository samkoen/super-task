package com.supershift.app;

/** Encodage volontairement léger — Vercel refuse un body > ~4,5 Mo via la fonction. */
final class VideoRecordSettings {
    static final int TARGET_BITRATE = 1_000_000;

    private VideoRecordSettings() {}

    static int targetBitrate() {
        return TARGET_BITRATE;
    }
}
