package com.supershift.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.FallbackStrategy;
import androidx.camera.video.FileOutputOptions;
import androidx.camera.video.PendingRecording;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executor;

public class VideoRecordActivity extends AppCompatActivity {
    static final String EXTRA_PATH = "path";
    static final String EXTRA_DURATION = "durationSeconds";
    static final String EXTRA_MIN_SECONDS = "minSeconds";

    private PreviewView previewView;
    private TextView timerView;
    private Button flipButton;
    private Button toggleButton;
    private ProcessCameraProvider cameraProvider;
    private VideoCapture<Recorder> videoCapture;
    private Recording recording;
    private boolean useBackCamera = true;
    private boolean switching;
    private boolean finishing;
    private boolean canceling;
    private boolean continueAfterStop;
    private int minSeconds;
    private final List<File> segments = new ArrayList<>();
    private long completedMs;
    private long segmentStartedAt;
    private final android.os.Handler timerHandler = new android.os.Handler();
    private final Runnable timerTick = this::updateTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_video_record);
        previewView = findViewById(R.id.video_preview);
        timerView = findViewById(R.id.video_timer);
        flipButton = findViewById(R.id.video_flip);
        toggleButton = findViewById(R.id.video_toggle);
        findViewById(R.id.video_close).setOnClickListener(v -> onCloseClicked());
        flipButton.setOnClickListener(v -> flipCamera());
        toggleButton.setOnClickListener(v -> toggleRecording());
        applySystemBarInsets();
        minSeconds = Math.max(0, getIntent().getIntExtra(EXTRA_MIN_SECONDS, 0));
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            setResult(RESULT_CANCELED);
            finish();
            return;
        }
        startCameraProvider();
    }

    private void applySystemBarInsets() {
        View controls = findViewById(R.id.video_controls);
        int base = Math.round(16 * getResources().getDisplayMetrics().density);
        ViewCompat.setOnApplyWindowInsetsListener(controls, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(base + bars.left, base, base + bars.right, base + bars.bottom);
            return windowInsets;
        });
        ViewCompat.setOnApplyWindowInsetsListener(timerView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setTranslationY(bars.top);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(controls);
    }

    private void startCameraProvider() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        Executor main = ContextCompat.getMainExecutor(this);
        future.addListener(() -> {
            try {
                cameraProvider = future.get();
                bindCamera();
            } catch (Exception ignored) {
                setResult(RESULT_CANCELED);
                finish();
            }
        }, main);
    }

    private void bindCamera() {
        if (cameraProvider == null) {
            return;
        }
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        Recorder recorder = new Recorder.Builder()
            .setQualitySelector(QualitySelector.fromOrderedList(
                Arrays.asList(Quality.HD, Quality.SD),
                FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)
            ))
            .build();
        videoCapture = VideoCapture.withOutput(recorder);
        cameraProvider.unbindAll();
        cameraProvider.bindToLifecycle(this, cameraSelector(), preview, videoCapture);
        flipButton.setEnabled(hasBothCameras());
    }

    private CameraSelector cameraSelector() {
        return useBackCamera ? CameraSelector.DEFAULT_BACK_CAMERA : CameraSelector.DEFAULT_FRONT_CAMERA;
    }

    private boolean hasBothCameras() {
        if (cameraProvider == null) {
            return false;
        }
        try {
            return cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)
                && cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA);
        } catch (Exception ignored) {
            return false;
        }
    }

    private void flipCamera() {
        if (switching || finishing || canceling || !hasBothCameras()) {
            return;
        }
        useBackCamera = !useBackCamera;
        if (recording == null) {
            bindCamera();
            return;
        }
        switching = true;
        continueAfterStop = true;
        stopCurrentSegment();
    }

    private void toggleRecording() {
        if (recording != null) {
            if (minSeconds > 0 && elapsedSeconds() < minSeconds) {
                android.widget.Toast.makeText(
                    this,
                    getString(R.string.video_record_too_short, minSeconds),
                    android.widget.Toast.LENGTH_SHORT
                ).show();
                return;
            }
            finishing = true;
            continueAfterStop = false;
            stopCurrentSegment();
            return;
        }
        startSegment();
    }

    private void startSegment() {
        if (videoCapture == null || recording != null) {
            return;
        }
        File file = new File(getCacheDir(), "seg-" + System.currentTimeMillis() + ".mp4");
        FileOutputOptions options = new FileOutputOptions.Builder(file).build();
        PendingRecording pending = videoCapture.getOutput().prepareRecording(this, options);
        try {
            pending = pending.withAudioEnabled();
        } catch (SecurityException ignored) {
            // Vidéo seule si le micro n'est pas accordé.
        }
        recording = pending.start(
            ContextCompat.getMainExecutor(this),
            event -> onRecordEvent(event, file)
        );
        segmentStartedAt = SystemClock.elapsedRealtime();
        toggleButton.setText(R.string.video_record_stop);
        timerHandler.post(timerTick);
    }

    private void onRecordEvent(@NonNull VideoRecordEvent event, File file) {
        if (!(event instanceof VideoRecordEvent.Finalize)) {
            return;
        }
        VideoRecordEvent.Finalize done = (VideoRecordEvent.Finalize) event;
        recording = null;
        addCompletedTime();
        if (!done.hasError() && file.exists() && file.length() > 0) {
            segments.add(file);
        }
        if (canceling) {
            canceling = false;
            continueAfterStop = false;
            switching = false;
            finishCanceled();
            return;
        }
        if (finishing) {
            finishing = false;
            continueAfterStop = false;
            switching = false;
            deliverResult();
            return;
        }
        if (continueAfterStop) {
            continueAfterStop = false;
            bindCamera();
            previewView.post(this::startSegment);
            switching = false;
        }
    }

    private void stopCurrentSegment() {
        if (recording == null) {
            return;
        }
        recording.stop();
    }

    private void addCompletedTime() {
        if (segmentStartedAt <= 0) {
            return;
        }
        completedMs += Math.max(0, SystemClock.elapsedRealtime() - segmentStartedAt);
        segmentStartedAt = 0;
    }

    private int elapsedSeconds() {
        long current = segmentStartedAt > 0 ? SystemClock.elapsedRealtime() - segmentStartedAt : 0;
        return (int) Math.max(0, (completedMs + current) / 1000);
    }

    private void updateTimer() {
        int seconds = elapsedSeconds();
        if (recording != null || switching) {
            timerView.setText(getString(R.string.video_record_recording) + " " + seconds);
            timerHandler.postDelayed(timerTick, 250);
            return;
        }
        timerView.setText(seconds > 0 ? String.valueOf(seconds) : "");
    }

    private void onCloseClicked() {
        continueAfterStop = false;
        if (recording != null) {
            canceling = true;
            stopCurrentSegment();
            return;
        }
        finishCanceled();
    }

    private void finishCanceled() {
        timerHandler.removeCallbacks(timerTick);
        deleteSegments();
        setResult(RESULT_CANCELED);
        finish();
    }

    private void deliverResult() {
        timerHandler.removeCallbacks(timerTick);
        File out = new File(getCacheDir(), "task-video-" + System.currentTimeMillis() + ".mp4");
        try {
            VideoSegmentMuxer.concat(segments, out);
            deleteSegments();
            Intent data = new Intent();
            data.putExtra(EXTRA_PATH, out.getAbsolutePath());
            data.putExtra(EXTRA_DURATION, Math.max(1, elapsedSeconds()));
            setResult(RESULT_OK, data);
        } catch (Exception ignored) {
            setResult(RESULT_CANCELED);
        }
        finish();
    }

    private void deleteSegments() {
        for (File file : segments) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
        segments.clear();
    }

    @Override
    public void onBackPressed() {
        onCloseClicked();
    }

    @Override
    protected void onDestroy() {
        timerHandler.removeCallbacks(timerTick);
        if (recording != null) {
            recording.close();
            recording = null;
        }
        super.onDestroy();
    }
}
