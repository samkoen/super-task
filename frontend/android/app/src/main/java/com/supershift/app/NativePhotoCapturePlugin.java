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

@CapacitorPlugin(name = "NativePhotoCapture")
public class NativePhotoCapturePlugin extends Plugin {

    @PluginMethod
    public void capture(PluginCall call) {
        Intent intent = new Intent(getContext(), PhotoCaptureActivity.class);
        startActivityForResult(call, intent, "onCaptured");
    }

    @ActivityCallback
    private void onCaptured(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        boolean ok = result.getResultCode() == Activity.RESULT_OK && result.getData() != null;
        String path = ok ? result.getData().getStringExtra(PhotoCaptureActivity.EXTRA_PATH) : null;
        NativeCaptureOutcome outcome = NativeCaptureOutcome.fromActivity(ok, path, 0);
        JSObject body = new JSObject();
        body.put("cancelled", outcome.cancelled);
        if (!outcome.cancelled) {
            body.put("path", outcome.path);
            body.put("mimeType", "image/jpeg");
        }
        call.resolve(body);
    }
}
