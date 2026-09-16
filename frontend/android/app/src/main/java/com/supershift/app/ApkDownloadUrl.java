package com.supershift.app;

final class ApkDownloadUrl {
    private ApkDownloadUrl() {}

    static String requireHttpUrl(String url) {
        if (url == null) {
            throw new IllegalArgumentException("missing-url");
        }
        String trimmed = url.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("missing-url");
        }
        String lower = trimmed.toLowerCase();
        if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
            throw new IllegalArgumentException("invalid-url");
        }
        return trimmed;
    }
}
