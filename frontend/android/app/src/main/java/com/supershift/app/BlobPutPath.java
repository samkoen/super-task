package com.supershift.app;

import java.io.File;

final class BlobPutPath {
    private BlobPutPath() {}

    static File resolvePath(String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }
        String cleaned = path.startsWith("file://") ? path.substring("file://".length()) : path;
        return new File(cleaned);
    }

    static File fileFromPath(String path) {
        File file = resolvePath(path);
        if (file == null || !file.isFile() || file.length() <= 0) {
            return null;
        }
        return file;
    }
}
