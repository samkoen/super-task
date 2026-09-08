package com.supershift.app;

import java.util.ArrayList;

final class MediaPermissionRequest {
    private MediaPermissionRequest() {}

    static String[] aliasesToRequest(
            boolean needCamera,
            boolean cameraGranted,
            boolean needMic,
            boolean micGranted) {
        ArrayList<String> aliases = new ArrayList<>();
        if (needCamera && !cameraGranted) {
            aliases.add("camera");
        }
        if (needMic && !micGranted) {
            aliases.add("microphone");
        }
        return aliases.toArray(new String[0]);
    }
}
