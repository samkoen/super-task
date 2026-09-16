package com.supershift.app;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

final class ApkFileDownloader {
    private static final OkHttpClient CLIENT =
            new OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.MINUTES)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .followRedirects(true)
                    .followSslRedirects(true)
                    .build();

    private ApkFileDownloader() {}

    static File download(String url, File dest) throws IOException {
        Request request = new Request.Builder().url(url).get().build();
        try (Response response = CLIENT.newCall(request).execute()) {
            copyResponse(response, dest);
        }
        if (!dest.isFile() || dest.length() <= 0) {
            throw new IOException("download failed");
        }
        return dest;
    }

    static void copyResponse(Response response, File dest) throws IOException {
        if (!response.isSuccessful()) {
            throw new IOException("download failed");
        }
        ResponseBody body = response.body();
        if (body == null) {
            throw new IOException("download failed");
        }
        copyStream(body.byteStream(), dest);
    }

    static void copyStream(InputStream in, File dest) throws IOException {
        try (InputStream input = in; FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int read;
            while ((read = input.read(buf)) != -1) {
                out.write(buf, 0, read);
            }
        }
    }
}
