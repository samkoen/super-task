package com.supershift.app;

final class VideoRecordTimer {
    private VideoRecordTimer() {}

    static String progressLabel(int elapsedSeconds, int minSeconds) {
        int elapsed = Math.max(0, elapsedSeconds);
        if (minSeconds > 0) {
            return elapsed + " / " + minSeconds;
        }
        return String.valueOf(elapsed);
    }
}
