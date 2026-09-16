package com.supershift.app;

import android.content.pm.PackageInfo;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ApkUpdate")
public class ApkUpdatePlugin extends Plugin {

    @PluginMethod
    public void installedInfo(PluginCall call) {
        try {
            PackageInfo info =
                    getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionCode", versionCodeOf(info));
            result.put("versionName", info.versionName != null ? info.versionName : "");
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "package-info");
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", ApkInstallIntents.canInstallPackages(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        getContext().startActivity(ApkInstallIntents.unknownSourcesSettings(getContext().getPackageName()));
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        try {
            String url = ApkDownloadUrl.requireHttpUrl(call.getString("url"));
            if (!ApkInstallIntents.canInstallPackages(getContext())) {
                call.reject("need-permission", "need-permission");
                return;
            }
            File dest = ApkDownloadFile.destination(getContext().getCacheDir());
            ApkFileDownloader.download(url, dest);
            getContext().startActivity(ApkInstallIntents.installView(getContext(), dest));
            call.resolve();
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "invalid-url");
        } catch (Exception error) {
            call.reject(error.getMessage() != null ? error.getMessage() : "download failed");
        }
    }

    @SuppressWarnings("deprecation")
    static int versionCodeOf(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28) {
            return (int) info.getLongVersionCode();
        }
        return info.versionCode;
    }
}
