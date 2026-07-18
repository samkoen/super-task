import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/aiService", () => ({
  aiService: {
    generateTaskTitle: vi.fn(),
  },
}));

import { aiService } from "../services/aiService";
import { ensureTaskTitle } from "./ensureTaskTitle";

describe("ensureTaskTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps an explicit title", async () => {
    await expect(ensureTaskTitle("  ניקוי  ", "long desc")).resolves.toBe("ניקוי");
    expect(aiService.generateTaskTitle).not.toHaveBeenCalled();
  });

  it("asks AI when title is empty", async () => {
    vi.mocked(aiService.generateTaskTitle).mockResolvedValue({ title: "סידור מדף" });
    await expect(ensureTaskTitle("", "צריך לסדר את המדף")).resolves.toBe("סידור מדף");
  });

  it("falls back to description start when AI fails", async () => {
    vi.mocked(aiService.generateTaskTitle).mockRejectedValue(new Error("down"));
    await expect(ensureTaskTitle(" ", "שורה ראשונה\nשורה שנייה")).resolves.toBe("שורה ראשונה");
  });

  it("rejects when both empty", async () => {
    await expect(ensureTaskTitle("", "  ")).rejects.toThrow("TITLE_OR_DESCRIPTION_REQUIRED");
  });
});
