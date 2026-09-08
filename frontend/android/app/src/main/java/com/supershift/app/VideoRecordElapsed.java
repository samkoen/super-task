package com.supershift.app;

final class VideoRecordElapsed {
    private VideoRecordElapsed() {}

    static int seconds(long completedMs, long segmentStartedAt, long nowMs) {
        long current = segmentStartedAt > 0 ? nowMs - segmentStartedAt : 0;
        return (int) Math.max(0, (completedMs + current) / 1000);
    }

    static boolean tooShortToFinish(int minSeconds, int elapsedSeconds) {
        return minSeconds > 0 && elapsedSeconds < minSeconds;
    }
}
