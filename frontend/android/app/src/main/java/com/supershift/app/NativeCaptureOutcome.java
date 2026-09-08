package com.supershift.app;

final class NativeCaptureOutcome {
    final boolean cancelled;
    final String path;
    final int durationSeconds;

    private NativeCaptureOutcome(boolean cancelled, String path, int durationSeconds) {
        this.cancelled = cancelled;
        this.path = path;
        this.durationSeconds = durationSeconds;
    }

    static NativeCaptureOutcome fromActivity(boolean resultOk, String path, int durationSeconds) {
        if (!resultOk || path == null || path.isEmpty()) {
            return new NativeCaptureOutcome(true, null, 0);
        }
        return new NativeCaptureOutcome(false, path, durationSeconds);
    }
}
