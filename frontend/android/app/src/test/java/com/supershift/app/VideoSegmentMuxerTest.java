package com.supershift.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import java.io.File;
import java.nio.file.Files;
import java.util.Collections;
import org.junit.Test;

public class VideoSegmentMuxerTest {
    @Test
    public void concatSinglePartCopiesBytes() throws Exception {
        File from = File.createTempFile("src", ".mp4");
        File to = File.createTempFile("dst", ".mp4");
        byte[] payload = new byte[] {1, 2, 3, 4};
        Files.write(from.toPath(), payload);
        VideoSegmentMuxer.concat(Collections.singletonList(from), to);
        assertEquals(payload.length, to.length());
        assertArrayEquals(payload, Files.readAllBytes(to.toPath()));
    }
}
