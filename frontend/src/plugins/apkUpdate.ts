import { Capacitor, registerPlugin } from "@capacitor/core";

type InstalledInfo = { versionCode: number; versionName: string };

type ApkUpdatePlugin = {
  installedInfo(): Promise<InstalledInfo>;
  canInstallPackages(): Promise<{ allowed: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<void>;
};

const ApkUpdate = registerPlugin<ApkUpdatePlugin>("ApkUpdate");

export function canUseApkUpdate(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export async function getInstalledAppInfo(): Promise<InstalledInfo> {
  return ApkUpdate.installedInfo();
}

export async function canInstallApkPackages(): Promise<boolean> {
  const result = await ApkUpdate.canInstallPackages();
  return Boolean(result?.allowed);
}

export async function openApkInstallPermissionSettings(): Promise<void> {
  await ApkUpdate.openInstallPermissionSettings();
}

export async function downloadAndInstallApk(url: string): Promise<void> {
  await ApkUpdate.downloadAndInstall({ url });
}

export function isApkInstallPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "need-permission" || message.includes("need-permission");
}
