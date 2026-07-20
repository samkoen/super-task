package com.supershift.app;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "MediaPermissions",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class MediaPermissionsPlugin extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        boolean needCamera = Boolean.TRUE.equals(call.getBoolean("camera", true));
        boolean needMic = Boolean.TRUE.equals(call.getBoolean("microphone", true));

        ArrayList<String> aliases = new ArrayList<>();
        if (needCamera && getPermissionState("camera") != PermissionState.GRANTED) {
            aliases.add("camera");
        }
        if (needMic && getPermissionState("microphone") != PermissionState.GRANTED) {
            aliases.add("microphone");
        }
        if (aliases.isEmpty()) {
            resolveStates(call);
            return;
        }
        requestPermissionForAliases(
            aliases.toArray(new String[0]),
            call,
            "permissionsCallback"
        );
    }

    @PluginMethod
    public void check(PluginCall call) {
        resolveStates(call);
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        resolveStates(call);
    }

    private void resolveStates(PluginCall call) {
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera").toString());
        result.put("microphone", getPermissionState("microphone").toString());
        call.resolve(result);
    }
}
