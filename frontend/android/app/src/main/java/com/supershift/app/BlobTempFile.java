package com.supershift.app;

import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

final class BlobTempFile {
    private BlobTempFile() {}

    static File create(File cacheDir, String ext) throws IOException {
        String suffix = ext != null && ext.startsWith(".") ? ext : ".mp4";
        File file = new File(cacheDir, "upload-" + System.currentTimeMillis() + suffix);
        if (!file.createNewFile() && !file.exists()) {
            throw new IOException("empty-video");
        }
        return file;
    }

    static void appendBase64(File file, String data) throws IOException {
        if (file == null || data == null || data.isEmpty()) {
            throw new IOException("empty-video");
        }
        byte[] bytes = Base64.decode(data, Base64.DEFAULT);
        try (FileOutputStream out = new FileOutputStream(file, true)) {
            out.write(bytes);
        }
    }
}
