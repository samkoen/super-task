package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class BlobPutJsonTest {
    @Test
    public void readsTheBlobUrl() {
        assertEquals(
                "https://abc.r2.cloudflarestorage.com/super-media/a.mp4",
                BlobPutJson.urlFromBody("{\"url\":\"https://abc.r2.cloudflarestorage.com/super-media/a.mp4\"}"));
    }

    @Test
    public void rejectsMissingOrNonHttpUrl() {
        assertNull(BlobPutJson.urlFromBody(null));
        assertNull(BlobPutJson.urlFromBody("{}"));
        assertNull(BlobPutJson.urlFromBody("{\"url\":\"not-a-url\"}"));
    }
}
