import { describe, expect, it } from "vitest";
import { systemBugPreviewLabel } from "./systemBugMeta";

describe("systemBugPreviewLabel", () => {
  it("is empty for a real oved", () => {
    expect(systemBugPreviewLabel({ is_preview: false } as never)).toBe("");
  });

  it("names the real manager in view-as", () => {
    expect(
      systemBugPreviewLabel({
        is_preview: true,
        preview_real_user: { id: "m1", full_name: "מנהל", role: "branch_manager" },
      } as never),
    ).toBe("כן (מנהל)");
  });
});
