import { describe, expect, it } from "vitest";
import {
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
