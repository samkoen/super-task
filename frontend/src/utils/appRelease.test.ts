import { describe, expect, it } from "vitest";
import {
  fillVersionPlaceholders,
  hasNewerAppRelease,
  isNewerAppRelease,
  isNewerAppVersion,
  nextVersionName,
  resolveApkDownloadUrl,
  versionCodeFromName,
} from "./appRelease";

describe("appRelease", () => {
  it("maps 1.0 / 1.1 to android version codes", () => {
    expect(versionCodeFromName("1.0")).toBe(100);
    expect(versionCodeFromName("1.1")).toBe(101);
    expect(nextVersionName("1.0")).toBe("1.1");
    expect(nextVersionName("1.1")).toBe("1.2");
  });

  it("detects a newer dotted version", () => {
    expect(isNewerAppVersion("1.0", "1.1")).toBe(true);
    expect(isNewerAppVersion("1.1", "1.1")).toBe(false);
    expect(isNewerAppRelease(100, 101)).toBe(true);
  });

  it("hides the update when the installed APK already matches latest", () => {
    const installed = { versionCode: 102, versionName: "1.2" };
    expect(
      hasNewerAppRelease(installed, { available: true, version_code: 102, version_name: "1.2" }),
    ).toBe(false);
    expect(
      hasNewerAppRelease(installed, { available: true, version_code: 103, version_name: "1.3" }),
    ).toBe(true);
    expect(
      hasNewerAppRelease(
        { versionCode: 103, versionName: "1.2" },
        { available: true, version_code: 103, version_name: "1.3" },
      ),
    ).toBe(false);
  });

  it("fills version placeholders in warning copy", () => {
    expect(fillVersionPlaceholders("חדש {latest} / ישן {current}", "1.2", "1.1")).toBe(
      "חדש 1.2 / ישן 1.1",
    );
    expect(fillVersionPlaceholders("רק {latest}", "1.2")).toBe("רק 1.2");
  });

  it("keeps absolute download URLs", () => {
    expect(resolveApkDownloadUrl("https://cdn.example/a.apk", "https://api.example/api")).toBe(
      "https://cdn.example/a.apk",
    );
  });

  it("joins local upload paths with the API origin", () => {
    expect(
      resolveApkDownloadUrl("/uploads/app_apks/a.apk", "http://10.0.2.2:5001/api"),
    ).toBe("http://10.0.2.2:5001/uploads/app_apks/a.apk");
  });
});
