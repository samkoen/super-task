package com.supershift.app;

import java.io.File;
import java.util.Map;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;

final class BlobPutRequestFactory {
    private BlobPutRequestFactory() {}

    static Request create(File file, String url, Map<String, String> headers) {
        String mime = contentTypeOf(headers);
        MediaType mediaType = MediaType.parse(mime != null && !mime.isEmpty() ? mime : "video/mp4");
        Request.Builder builder = new Request.Builder().url(url).put(RequestBody.create(file, mediaType));
        if (headers != null) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (header.getKey() != null && header.getValue() != null && !isContentType(header.getKey())) {
                    builder.header(header.getKey(), header.getValue());
                }
            }
        }
        return builder.build();
    }

    static String contentTypeOf(Map<String, String> headers) {
        if (headers == null) {
            return null;
        }
        String type = headers.get("Content-Type");
        if (type == null) {
            type = headers.get("content-type");
        }
        if (type == null) {
            type = headers.get("x-content-type");
        }
        return type;
    }

    static boolean isContentType(String key) {
        return key.equalsIgnoreCase("Content-Type") || key.equalsIgnoreCase("x-content-type");
    }
}
