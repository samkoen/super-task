package com.supershift.app;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.List;

/** Assemble des extraits MP4 CameraX en un seul fichier (petite coupure au switch). */
final class VideoSegmentMuxer {
    private static final long GAP_US = 50_000L;

    private VideoSegmentMuxer() {}

    static void concat(List<File> parts, File output) throws IOException {
        if (parts == null || parts.isEmpty()) {
            throw new IOException("no video segments");
        }
        if (parts.size() == 1) {
            copy(parts.get(0), output);
            return;
        }
        writeMany(parts, output);
    }

    static void copy(File from, File to) throws IOException {
        try (FileInputStream in = new FileInputStream(from);
                FileOutputStream out = new FileOutputStream(to)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
            }
        }
    }

    private static void writeMany(List<File> parts, File output) throws IOException {
        MediaMuxer muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
        boolean started = false;
        try {
            TrackMap tracks = addTracksFromFirst(muxer, parts.get(0));
            muxer.start();
            started = true;
            writeAllParts(muxer, parts, tracks);
        } finally {
            if (started) {
                muxer.stop();
            }
            muxer.release();
        }
    }

    private static TrackMap addTracksFromFirst(MediaMuxer muxer, File first) throws IOException {
        MediaExtractor extractor = new MediaExtractor();
        extractor.setDataSource(first.getAbsolutePath());
        TrackMap map = new TrackMap();
        for (int i = 0; i < extractor.getTrackCount(); i++) {
            MediaFormat format = extractor.getTrackFormat(i);
            String mime = format.getString(MediaFormat.KEY_MIME);
            if (mime != null && mime.startsWith("video/") && map.videoDst < 0) {
                map.videoDst = muxer.addTrack(format);
            } else if (mime != null && mime.startsWith("audio/") && map.audioDst < 0) {
                map.audioDst = muxer.addTrack(format);
            }
        }
        extractor.release();
        if (map.videoDst < 0) {
            throw new IOException("no video track");
        }
        return map;
    }

    private static void writeAllParts(MediaMuxer muxer, List<File> parts, TrackMap tracks)
            throws IOException {
        long videoOffset = 0;
        long audioOffset = 0;
        for (File part : parts) {
            MediaExtractor extractor = new MediaExtractor();
            extractor.setDataSource(part.getAbsolutePath());
            int srcVideo = findTrack(extractor, "video/");
            int srcAudio = findTrack(extractor, "audio/");
            long videoEnd = copyTrack(extractor, muxer, srcVideo, tracks.videoDst, videoOffset);
            long audioEnd = copyTrack(extractor, muxer, srcAudio, tracks.audioDst, audioOffset);
            extractor.release();
            if (videoEnd > 0) {
                videoOffset = videoEnd + GAP_US;
            }
            if (audioEnd > 0) {
                audioOffset = audioEnd + GAP_US;
            }
        }
    }

    private static int findTrack(MediaExtractor extractor, String prefix) {
        for (int i = 0; i < extractor.getTrackCount(); i++) {
            String mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME);
            if (mime != null && mime.startsWith(prefix)) {
                return i;
            }
        }
        return -1;
    }

    private static long copyTrack(
            MediaExtractor extractor,
            MediaMuxer muxer,
            int srcTrack,
            int dstTrack,
            long ptsOffset
    ) {
        if (srcTrack < 0 || dstTrack < 0) {
            return 0;
        }
        extractor.selectTrack(srcTrack);
        extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC);
        ByteBuffer buffer = ByteBuffer.allocate(sampleBufferBytes(extractor.getTrackFormat(srcTrack)));
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        long maxPts = 0;
        while (true) {
            int size = extractor.readSampleData(buffer, 0);
            if (size < 0) {
                break;
            }
            info.offset = 0;
            info.size = size;
            info.presentationTimeUs = extractor.getSampleTime() + ptsOffset;
            info.flags = extractor.getSampleFlags();
            muxer.writeSampleData(dstTrack, buffer, info);
            maxPts = Math.max(maxPts, info.presentationTimeUs);
            extractor.advance();
        }
        extractor.unselectTrack(srcTrack);
        return maxPts;
    }

    static int sampleBufferBytes(MediaFormat format) {
        int minBytes = 4 * 1024 * 1024;
        if (format == null || !format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
            return minBytes;
        }
        return Math.max(minBytes, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE));
    }

    private static final class TrackMap {
        int videoDst = -1;
        int audioDst = -1;
    }
}
