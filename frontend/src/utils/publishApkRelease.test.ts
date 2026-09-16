import { describe, expect, it, vi, beforeEach } from "vitest";
import { publishSelectedApk } from "./publishApkRelease";
import { appReleaseService } from "../services/appReleaseService";

vi.mock("../services/appReleaseService", () => ({
  appReleaseService: {
    createIntent: vi.fn(),
    uploadProxy: vi.fn(),
    publish: vi.fn(),
  },
}));

describe("publishSelectedApk", () => {
  beforeEach(() => {
    vi.mocked(appReleaseService.createIntent).mockReset();
    vi.mocked(appReleaseService.uploadProxy).mockReset();
    vi.mocked(appReleaseService.publish).mockReset();
  });
  it("uses the local proxy then publishes", async () => {
    vi.mocked(appReleaseService.createIntent).mockResolvedValue({ mode: "proxy" });
    vi.mocked(appReleaseService.uploadProxy).mockResolvedValue({ url: "/uploads/app_apks/a.apk" });
    vi.mocked(appReleaseService.publish).mockResolvedValue({
      message: "ok",
      release: { id: "1", version_code: 101, version_name: "1.1" },
    });
    const file = new File(["apk"], "super.apk");
    await publishSelectedApk(file, "1.1");
    expect(appReleaseService.uploadProxy).toHaveBeenCalledWith(file);
    expect(appReleaseService.publish).toHaveBeenCalledWith({
      version_name: "1.1",
      apk_url: "/uploads/app_apks/a.apk",
    });
  });

  it("PUTs to the signed URL in direct mode", async () => {
    vi.mocked(appReleaseService.createIntent).mockResolvedValue({
      mode: "direct",
      putUrl: "https://r2.example/put",
      headers: { "Content-Type": "application/vnd.android.package-archive" },
      url: "https://r2.example/a.apk",
    });
    const putFile = vi.fn().mockResolvedValue(undefined);
    const file = new File(["apk"], "super.apk");
    await publishSelectedApk(file, "1.2", putFile);
    expect(putFile).toHaveBeenCalled();
    expect(appReleaseService.uploadProxy).not.toHaveBeenCalled();
    expect(appReleaseService.publish).toHaveBeenCalledWith({
      version_name: "1.2",
      apk_url: "https://r2.example/a.apk",
    });
  });
});
