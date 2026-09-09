package com.supershift.app;

import java.io.File;
import java.util.Map;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;

final class BlobPutRequestFactory {
    private BlobPutRequestFactory() {}

    static Request create(File file, String url, Map<String, String> headers) {
        String mime = headers != null ? headers.get("x-content-type") : null;
        MediaType mediaType = MediaType.parse(mime != null && !mime.isEmpty() ? mime : "video/mp4");
        Request.Builder builder = new Request.Builder().url(url).put(RequestBody.create(file, mediaType));
        if (headers != null) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (header.getKey() != null && header.getValue() != null) {
                    builder.header(header.getKey(), header.getValue());
                }
            }
        }
        return builder.build();
    }
}
