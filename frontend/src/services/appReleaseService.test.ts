import { describe, expect, it, vi } from "vitest";
import { appReleaseService } from "./appReleaseService";
import api from "./api";

vi.mock("./api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe("appReleaseService", () => {
  it("loads the latest published APK", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { available: true, version_code: 101, version_name: "1.1", download_url: "/uploads/a.apk" },
    });
    const latest = await appReleaseService.latest();
    expect(api.get).toHaveBeenCalledWith("/app-releases/latest");
    expect(latest.version_name).toBe("1.1");
  });

  it("uploads an APK through the proxy as multipart", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { url: "/uploads/app_apks/a.apk" } });
    const file = new File(["apk"], "super.apk", { type: "application/vnd.android.package-archive" });
    const uploaded = await appReleaseService.uploadProxy(file);
    expect(uploaded.url).toBe("/uploads/app_apks/a.apk");
    expect(api.post).toHaveBeenCalledWith(
      "/app-releases/upload",
      expect.any(FormData),
      { timeout: 10 * 60 * 1000 },
    );
  });
});
