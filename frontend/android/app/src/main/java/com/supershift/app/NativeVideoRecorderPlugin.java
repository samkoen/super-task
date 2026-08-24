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
        JSObject body = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            body.put("cancelled", true);
            call.resolve(body);
            return;
        }
        String path = result.getData().getStringExtra(VideoRecordActivity.EXTRA_PATH);
        if (path == null || path.isEmpty()) {
            body.put("cancelled", true);
            call.resolve(body);
            return;
        }
        body.put("cancelled", false);
        body.put("path", path);
        body.put("mimeType", "video/mp4");
        body.put("durationSeconds", result.getData().getIntExtra(VideoRecordActivity.EXTRA_DURATION, 1));
        call.resolve(body);
    }
}
