import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const latest = vi.fn();
const getInstalledAppInfo = vi.fn();
const canUseApkUpdate = vi.fn();
const canInstallApkPackages = vi.fn();
const openApkInstallPermissionSettings = vi.fn();
const downloadAndInstallApk = vi.fn();

vi.mock("../services/appReleaseService", () => ({
  appReleaseService: { latest: (...args: unknown[]) => latest(...args) },
}));
vi.mock("../plugins/apkUpdate", () => ({
  canUseApkUpdate: () => canUseApkUpdate(),
  getInstalledAppInfo: (...args: unknown[]) => getInstalledAppInfo(...args),
  canInstallApkPackages: (...args: unknown[]) => canInstallApkPackages(...args),
  openApkInstallPermissionSettings: (...args: unknown[]) => openApkInstallPermissionSettings(...args),
  downloadAndInstallApk: (...args: unknown[]) => downloadAndInstallApk(...args),
  isApkInstallPermissionError: () => false,
}));
vi.mock("../services/apiBaseUrl", () => ({
  resolveApiBaseUrl: () => "https://api.example/api",
}));

import { useAppUpdate } from "./useAppUpdate";

describe("useAppUpdate", () => {
  it("marks an update as available when the server version is newer", async () => {
    canUseApkUpdate.mockReturnValue(true);
    getInstalledAppInfo.mockResolvedValue({ versionCode: 101, versionName: "1.1" });
    latest.mockResolvedValue({
      available: true,
      version_code: 102,
      version_name: "1.2",
      download_url: "https://cdn.example/a.apk",
    });
    const { result } = renderHook(() => useAppUpdate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.updateAvailable).toBe(true);
  });
});
