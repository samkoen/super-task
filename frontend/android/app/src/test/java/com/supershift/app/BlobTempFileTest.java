package com.supershift.app;

import static org.junit.Assert.assertTrue;

import java.io.File;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BlobTempFileTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void namesTheTempFileWithTheVideoExtension() throws Exception {
        File file = BlobTempFile.create(folder.getRoot(), ".webm");
        assertTrue(file.getName().endsWith(".webm"));
        assertTrue(file.isFile());
    }
}
