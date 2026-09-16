package com.supershift.app;

final class ApkVersionCodes {
    private ApkVersionCodes() {}

    static boolean isNewer(int installed, int latest) {
        return latest > installed;
    }
}
