package com.supershift.app;

import java.io.File;

final class ApkDownloadFile {
    static final String FILE_NAME = "super-update.apk";

    private ApkDownloadFile() {}

    static File destination(File cacheDir) {
        return new File(cacheDir, FILE_NAME);
    }
}
