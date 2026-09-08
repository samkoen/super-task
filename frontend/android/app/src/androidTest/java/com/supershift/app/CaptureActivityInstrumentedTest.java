package com.supershift.app;

import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = Build.VERSION_CODES.P)
public class CaptureActivityInstrumentedTest {

    @Before
    public void revokeCameraPermission() {
        try {
            InstrumentationRegistry.getInstrumentation()
                .getUiAutomation()
                .revokeRuntimePermission("com.supershift.app", Manifest.permission.CAMERA);
        } catch (SecurityException ignored) {
            // Certains OEM (Samsung) refusent le revoke en instrumented.
        }
    }

    @Test
    public void photoCaptureCancelsWithoutCameraPermission() {
        assumeCameraDenied();
        assertFinishesWithoutCamera(PhotoCaptureActivity.class);
    }

    @Test
    public void videoRecordCancelsWithoutCameraPermission() {
        assumeCameraDenied();
        assertFinishesWithoutCamera(VideoRecordActivity.class);
    }

    private static void assumeCameraDenied() {
        assumeTrue(
            "CAMERA still granted — cannot test cancel-without-permission on this device",
            cameraDenied()
        );
    }

    private static boolean cameraDenied() {
        Context ctx = ApplicationProvider.getApplicationContext();
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED;
    }

    private static void assertFinishesWithoutCamera(Class<? extends Activity> cls) {
        Context ctx = ApplicationProvider.getApplicationContext();
        Intent intent = new Intent(ctx, cls);
        try (ActivityScenario<Activity> scenario = ActivityScenario.launch(intent)) {
            scenario.onActivity(activity ->
                assertTrue(
                    "capture activity must finish when CAMERA is denied",
                    activity.isFinishing() || activity.isDestroyed()
                )
            );
        }
    }
}
