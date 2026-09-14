import { describe, expect, it, vi } from "vitest";
import { siyumTrace } from "./siyumTrace";

describe("siyumTrace", () => {
  it("logs a step with optional detail", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    siyumTrace("video-upload-proxy");
    siyumTrace("complete-post", { taskId: "occ-1" });
    expect(info).toHaveBeenCalledWith("[siyum] video-upload-proxy");
    expect(info).toHaveBeenCalledWith("[siyum] complete-post", { taskId: "occ-1" });
    info.mockRestore();
  });
});
