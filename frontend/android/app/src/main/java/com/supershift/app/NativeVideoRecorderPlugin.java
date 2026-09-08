package com.supershift.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeVideoRecorder")
public class NativeVideoRecorderPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void record(PluginCall call) {
        Intent intent = new Intent(getContext(), VideoRecordActivity.class);
        Integer minSeconds = call.getInt("minSeconds");
        if (minSeconds != null && minSeconds > 0) {
            intent.putExtra(VideoRecordActivity.EXTRA_MIN_SECONDS, minSeconds);
        }
        startActivityForResult(call, intent, "onRecorded");
    }

    @ActivityCallback
    private void onRecorded(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        boolean ok = result.getResultCode() == Activity.RESULT_OK && result.getData() != null;
        String path = ok ? result.getData().getStringExtra(VideoRecordActivity.EXTRA_PATH) : null;
        int duration = ok ? result.getData().getIntExtra(VideoRecordActivity.EXTRA_DURATION, 1) : 0;
        NativeCaptureOutcome outcome = NativeCaptureOutcome.fromActivity(ok, path, duration);
        JSObject body = new JSObject();
        body.put("cancelled", outcome.cancelled);
        if (!outcome.cancelled) {
            body.put("path", outcome.path);
            body.put("mimeType", "video/mp4");
            body.put("durationSeconds", Math.max(1, outcome.durationSeconds));
        }
        call.resolve(body);
    }
}
