package com.supershift.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.json.JSONException;

@CapacitorPlugin(name = "NativeBlobUpload")
public class NativeBlobUploadPlugin extends Plugin {

    @PluginMethod
    public void createTemp(PluginCall call) {
        try {
            File file = BlobTempFile.create(getContext().getCacheDir(), call.getString("ext", ".mp4"));
            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "empty-video");
        }
    }

    @PluginMethod
    public void appendChunk(PluginCall call) {
        File file = BlobPutPath.resolvePath(call.getString("path"));
        if (file == null) {
            call.reject("empty-video");
            return;
        }
        try {
            BlobTempFile.appendBase64(file, call.getString("data"));
            call.resolve();
        } catch (Exception error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "empty-video");
        }
    }

    @PluginMethod
    public void putFromFile(PluginCall call) {
        File file = BlobPutPath.fileFromPath(call.getString("path"));
        String url = call.getString("url");
        if (file == null || url == null || url.isEmpty()) {
            call.reject("empty-video");
            return;
        }
        try {
            String blobUrl = BlobFilePutter.put(file, url, headersFrom(call.getObject("headers")));
            JSObject result = new JSObject();
            result.put("url", blobUrl);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "upload failed");
        }
    }

    static Map<String, String> headersFrom(JSObject headers) throws JSONException {
        Map<String, String> map = new HashMap<>();
        if (headers == null) {
            return map;
        }
        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            String value = headers.getString(key);
            if (value != null) {
                map.put(key, value);
            }
        }
        return map;
    }
}
