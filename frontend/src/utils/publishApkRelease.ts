import { appReleaseService, type ApkUploadIntent } from "../services/appReleaseService";

const APK_CONTENT_TYPE = "application/vnd.android.package-archive";

export async function publishSelectedApk(
  file: File,
  versionName: string,
  putFile: (url: string, body: File, headers: Record<string, string>) => Promise<void> = putWithFetch,
): Promise<void> {
  const apkUrl = await uploadApkFile(file, putFile);
  await appReleaseService.publish({
    version_name: versionName,
    apk_url: apkUrl,
  });
}

async function uploadApkFile(
  file: File,
  putFile: (url: string, body: File, headers: Record<string, string>) => Promise<void>,
): Promise<string> {
  const intent = await appReleaseService.createIntent(file.size);
  if (intent.mode === "direct") {
    await putDirectApk(intent, file, putFile);
    return intent.url;
  }
  const uploaded = await appReleaseService.uploadProxy(file);
  return uploaded.url;
}

async function putDirectApk(
  intent: Extract<ApkUploadIntent, { mode: "direct" }>,
  file: File,
  putFile: (url: string, body: File, headers: Record<string, string>) => Promise<void>,
): Promise<void> {
  await putFile(intent.putUrl, file, {
    ...intent.headers,
    "Content-Type": intent.headers["Content-Type"] || APK_CONTENT_TYPE,
  });
}

async function putWithFetch(
  url: string,
  body: File,
  headers: Record<string, string>,
): Promise<void> {
  const response = await fetch(url, { method: "PUT", headers, body });
  if (!response.ok) throw new Error("upload failed");
}
