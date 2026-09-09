package com.supershift.app;

final class BlobPutJson {
    private BlobPutJson() {}

    static String urlFromBody(String body) {
        if (body == null) {
            return null;
        }
        int key = body.indexOf("\"url\"");
        if (key < 0) {
            return null;
        }
        int quote = body.indexOf('"', body.indexOf(':', key) + 1);
        int end = quote < 0 ? -1 : body.indexOf('"', quote + 1);
        if (quote < 0 || end < 0) {
            return null;
        }
        String url = body.substring(quote + 1, end).trim();
        return url.startsWith("http") ? url : null;
    }
}
