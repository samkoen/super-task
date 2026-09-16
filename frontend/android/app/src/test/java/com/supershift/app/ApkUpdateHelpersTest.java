package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ApkUpdateHelpersTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void newerVersionCodeWins() {
        assertTrue(ApkVersionCodes.isNewer(1, 2));
        assertFalse(ApkVersionCodes.isNewer(2, 2));
        assertFalse(ApkVersionCodes.isNewer(3, 2));
    }

    @Test
    public void acceptsHttpUrlsOnly() {
        assertEquals("https://cdn.example/a.apk", ApkDownloadUrl.requireHttpUrl(" https://cdn.example/a.apk "));
        assertEquals("http://10.0.2.2:5001/uploads/a.apk", ApkDownloadUrl.requireHttpUrl("http://10.0.2.2:5001/uploads/a.apk"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsNonHttpUrls() {
        ApkDownloadUrl.requireHttpUrl("javascript:alert(1)");
    }

    @Test
    public void writesDownloadIntoCacheFile() throws Exception {
        File dest = ApkDownloadFile.destination(folder.getRoot());
        assertEquals("super-update.apk", dest.getName());
        ApkFileDownloader.copyStream(
                new ByteArrayInputStream("apk".getBytes(StandardCharsets.UTF_8)), dest);
        assertTrue(dest.isFile());
        assertEquals(3, dest.length());
    }
}
