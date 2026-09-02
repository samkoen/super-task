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
        JSObject body = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            body.put("cancelled", true);
            call.resolve(body);
            return;
        }
        String path = result.getData().getStringExtra(PhotoCaptureActivity.EXTRA_PATH);
        if (path == null || path.isEmpty()) {
            body.put("cancelled", true);
            call.resolve(body);
            return;
        }
        body.put("cancelled", false);
        body.put("path", path);
        body.put("mimeType", "image/jpeg");
        call.resolve(body);
    }
}
