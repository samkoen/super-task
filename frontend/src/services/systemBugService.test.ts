import { describe, expect, it, vi } from "vitest";
import { getSystemBug, listSystemBugs, submitSystemBug } from "./systemBugService";
import api from "./api";

vi.mock("./api", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe("submitSystemBug", () => {
  it("posts multipart fields and files", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true } });
    const shot = new Blob(["x"], { type: "image/png" });
    await submitSystemBug({
      note: "bug",
      route: "/employee",
      trail: ["/manager", "/employee"],
      appVersion: "0.1.0",
      screenshot: shot,
    });
    expect(api.post).toHaveBeenCalledWith(
      "/system-bugs",
      expect.any(FormData),
      { timeout: 60_000 },
    );
    const form = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect(form.get("note")).toBe("bug");
    expect(form.get("route")).toBe("/employee");
    const shotFile = form.get("screenshot") as File;
    expect(shotFile.name).toBe("screenshot.jpg");
  });

  it("names a wav recording for gmail", async () => {
    vi.mocked(api.post).mockClear();
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true } });
    const audio = new Blob(["RIFF"], { type: "audio/wav" });
    await submitSystemBug({
      note: "bug",
      route: "/employee",
      trail: ["/employee"],
      appVersion: "0.1.0",
      audio,
    });
    const form = vi.mocked(api.post).mock.calls[0][1] as FormData;
    expect((form.get("audio") as File).name).toBe("explanation.wav");
  });

  it("lists inbox items", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [{ id: "1", note: "נפל" }] } });
    const items = await listSystemBugs();
    expect(api.get).toHaveBeenCalledWith("/system-bugs");
    expect(items[0].id).toBe("1");
    vi.mocked(api.get).mockResolvedValueOnce({ data: { report: { id: "1", note: "נפל" } } });
    const report = await getSystemBug("1");
    expect(api.get).toHaveBeenCalledWith("/system-bugs/1");
    expect(report.note).toBe("נפל");
  });
});
