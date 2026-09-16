import { describe, expect, it, vi } from "vitest";

const {
  installedInfo,
  canInstallPackages,
  openInstallPermissionSettings,
  downloadAndInstall,
  isNativePlatform,
  getPlatform,
} = vi.hoisted(() => ({
  installedInfo: vi.fn(),
  canInstallPackages: vi.fn(),
  openInstallPermissionSettings: vi.fn(),
  downloadAndInstall: vi.fn(),
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    getPlatform: () => getPlatform(),
  },
  registerPlugin: () => ({
    installedInfo,
    canInstallPackages,
    openInstallPermissionSettings,
    downloadAndInstall,
  }),
}));

import {
  canUseApkUpdate,
  downloadAndInstallApk,
  getInstalledAppInfo,
  isApkInstallPermissionError,
} from "./apkUpdate";

describe("apkUpdate", () => {
  it("is only available on native Android", () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    expect(canUseApkUpdate()).toBe(true);
    getPlatform.mockReturnValue("web");
    expect(canUseApkUpdate()).toBe(false);
  });

  it("reads the installed version from the plugin", async () => {
    installedInfo.mockResolvedValue({ versionCode: 2, versionName: "1.1" });
    await expect(getInstalledAppInfo()).resolves.toEqual({ versionCode: 2, versionName: "1.1" });
  });

  it("starts download and install with the APK url", async () => {
    downloadAndInstall.mockResolvedValue(undefined);
    await downloadAndInstallApk("https://cdn.example/super.apk");
    expect(downloadAndInstall).toHaveBeenCalledWith({ url: "https://cdn.example/super.apk" });
  });

  it("detects the unknown-sources permission error", () => {
    expect(isApkInstallPermissionError({ code: "need-permission" })).toBe(true);
    expect(isApkInstallPermissionError(new Error("fail"))).toBe(false);
  });
});
