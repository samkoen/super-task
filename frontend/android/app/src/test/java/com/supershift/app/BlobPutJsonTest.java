package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class BlobPutJsonTest {
    @Test
    public void readsTheBlobUrl() {
        assertEquals(
                "https://store.blob.vercel-storage.com/a.mp4",
                BlobPutJson.urlFromBody("{\"url\":\"https://store.blob.vercel-storage.com/a.mp4\"}"));
    }

    @Test
    public void rejectsMissingOrNonHttpUrl() {
        assertNull(BlobPutJson.urlFromBody(null));
        assertNull(BlobPutJson.urlFromBody("{}"));
        assertNull(BlobPutJson.urlFromBody("{\"url\":\"not-a-url\"}"));
    }
}
