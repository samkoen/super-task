package com.supershift.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.concurrent.Executor;

public class PhotoCaptureActivity extends AppCompatActivity {
    static final String EXTRA_PATH = "path";

    private PreviewView previewView;
    private Button flipButton;
    private Button shutterButton;
    private ProcessCameraProvider cameraProvider;
    private ImageCapture imageCapture;
    private boolean useBackCamera = true;
    private boolean capturing;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_photo_capture);
        previewView = findViewById(R.id.photo_preview);
        flipButton = findViewById(R.id.photo_flip);
        shutterButton = findViewById(R.id.photo_shutter);
        findViewById(R.id.photo_close).setOnClickListener(v -> finishCanceled());
        flipButton.setOnClickListener(v -> flipCamera());
        shutterButton.setOnClickListener(v -> takePhoto());
        applySystemBarInsets();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            finishCanceled();
            return;
        }
        startCameraProvider();
    }

    private void applySystemBarInsets() {
        View controls = findViewById(R.id.photo_controls);
        int base = Math.round(16 * getResources().getDisplayMetrics().density);
        ViewCompat.setOnApplyWindowInsetsListener(controls, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(base + bars.left, base, base + bars.right, base + bars.bottom);
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
                finishCanceled();
            }
        }, main);
    }

    private void bindCamera() {
        if (cameraProvider == null) {
            return;
        }
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        imageCapture = new ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build();
        cameraProvider.unbindAll();
        cameraProvider.bindToLifecycle(this, cameraSelector(), preview, imageCapture);
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
        if (capturing || !hasBothCameras()) {
            return;
        }
        useBackCamera = !useBackCamera;
        bindCamera();
    }

    private void takePhoto() {
        if (imageCapture == null || capturing) {
            return;
        }
        capturing = true;
        shutterButton.setEnabled(false);
        File file = new File(getCacheDir(), "task-photo-" + System.currentTimeMillis() + ".jpg");
        ImageCapture.OutputFileOptions options = new ImageCapture.OutputFileOptions.Builder(file).build();
        imageCapture.takePicture(
            options,
            ContextCompat.getMainExecutor(this),
            new ImageCapture.OnImageSavedCallback() {
                @Override
                public void onImageSaved(@NonNull ImageCapture.OutputFileResults output) {
                    deliverResult(file);
                }

                @Override
                public void onError(@NonNull ImageCaptureException exception) {
                    finishCanceled();
                }
            }
        );
    }

    private void deliverResult(File file) {
        if (!file.exists() || file.length() <= 0) {
            finishCanceled();
            return;
        }
        Intent data = new Intent();
        data.putExtra(EXTRA_PATH, file.getAbsolutePath());
        setResult(RESULT_OK, data);
        finish();
    }

    private void finishCanceled() {
        setResult(RESULT_CANCELED);
        finish();
    }

    @Override
    public void onBackPressed() {
        finishCanceled();
    }
}
