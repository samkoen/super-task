package com.supershift.app;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Response;
import okhttp3.ResponseBody;

final class BlobFilePutter {
    private static final OkHttpClient CLIENT =
            new OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(120, TimeUnit.SECONDS)
                    .readTimeout(60, TimeUnit.SECONDS)
                    .build();

    private BlobFilePutter() {}

    static String put(File file, String url, Map<String, String> headers) throws IOException {
        try (Response response = CLIENT.newCall(BlobPutRequestFactory.create(file, url, headers)).execute()) {
            String body = readBody(response.body());
            if (!response.isSuccessful()) {
                throw new IOException("upload failed");
            }
            String blobUrl = BlobPutJson.urlFromBody(body);
            if (blobUrl == null) {
                throw new IOException("upload failed");
            }
            return blobUrl;
        }
    }

    private static String readBody(ResponseBody body) throws IOException {
        return body == null ? "" : body.string();
    }
}
