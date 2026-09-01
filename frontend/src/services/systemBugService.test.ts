import { describe, expect, it, vi } from "vitest";
import { submitSystemBug } from "./systemBugService";
import api from "./api";

vi.mock("./api", () => ({
  default: { post: vi.fn() },
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
  });
});
