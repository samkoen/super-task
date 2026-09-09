package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BlobPutPathTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void acceptsAnExistingNonEmptyFile() throws Exception {
        File video = folder.newFile("task-video.mp4");
        try (FileOutputStream out = new FileOutputStream(video)) {
            out.write("mp4".getBytes(StandardCharsets.UTF_8));
        }
        assertEquals(video.getAbsolutePath(), BlobPutPath.fileFromPath(video.getAbsolutePath()).getAbsolutePath());
        assertEquals(
                video.getAbsolutePath(),
                BlobPutPath.fileFromPath("file://" + video.getAbsolutePath()).getAbsolutePath());
    }

    @Test
    public void rejectsMissingOrEmptyPaths() throws Exception {
        File empty = folder.newFile("empty.mp4");
        assertNull(BlobPutPath.fileFromPath(null));
        assertNull(BlobPutPath.fileFromPath(""));
        assertNull(BlobPutPath.fileFromPath(empty.getAbsolutePath()));
        assertNull(BlobPutPath.fileFromPath(new File(folder.getRoot(), "missing.mp4").getAbsolutePath()));
    }
}
