package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import okhttp3.Request;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BlobPutRequestFactoryTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void putsTheFileWithBlobClientHeaders() throws Exception {
        File video = folder.newFile("clip.mp4");
        try (FileOutputStream out = new FileOutputStream(video)) {
            out.write("mp4".getBytes(StandardCharsets.UTF_8));
        }
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "video/mp4");
        Request request =
                BlobPutRequestFactory.create(video, "https://signed.example/put/a.mp4", headers);
        assertEquals("PUT", request.method());
        assertEquals("https://signed.example/put/a.mp4", request.url().toString());
        assertEquals("video/mp4", request.body().contentType().toString());
        assertNotNull(request.body());
        assertEquals(3L, request.body().contentLength());
    }
}
