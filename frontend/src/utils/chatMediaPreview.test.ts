import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearChatMediaPreviews,
  peekChatMediaPreview,
  rememberChatMediaPreview,
} from "./chatMediaPreview";

describe("chatMediaPreview", () => {
  afterEach(() => {
    clearChatMediaPreviews();
  });

  it("stores a local preview for the uploaded photo url", () => {
    const createObjectURL = vi.fn(() => "blob:photo-1");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
    rememberChatMediaPreview({ photo_url: "/uploads/p.jpg" }, file);
    expect(peekChatMediaPreview("/uploads/p.jpg")).toBe("blob:photo-1");
    expect(createObjectURL).toHaveBeenCalledWith(file);
  });

  it("does not throw when the local preview cannot be created", () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => {
        throw new Error("no preview");
      },
    });
    expect(() => {
      rememberChatMediaPreview({ photo_url: "/uploads/p.jpg" }, new File(["x"], "p.jpg"));
    }).not.toThrow();
    expect(peekChatMediaPreview("/uploads/p.jpg")).toBeNull();
  });

  it("ignores file-only payloads", () => {
    rememberChatMediaPreview({ file_url: "/uploads/a.pdf" }, new File(["x"], "a.pdf"));
    expect(peekChatMediaPreview("/uploads/a.pdf")).toBeNull();
  });
});

