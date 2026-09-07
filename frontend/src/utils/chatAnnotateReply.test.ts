import { describe, expect, it } from "vitest";
import { CHAT_CAPTION_MAX, canAnnotateChatReply, clipChatCaption } from "./chatAnnotateReply";

describe("canAnnotateChatReply", () => {
  it("allows annotating a received photo when compose is open", () => {
    expect(canAnnotateChatReply(true, false)).toBe(true);
  });

  it("hides the action on own photos or when compose is closed", () => {
    expect(canAnnotateChatReply(true, true)).toBe(false);
    expect(canAnnotateChatReply(false, false)).toBe(false);
  });
});

describe("clipChatCaption", () => {
  it("trims empty input to an empty caption", () => {
    expect(clipChatCaption("   ")).toBe("");
    expect(clipChatCaption(null)).toBe("");
  });

  it("keeps a short caption and clips a too-long one", () => {
    expect(clipChatCaption("  שלום  ")).toBe("שלום");
    expect(clipChatCaption("x".repeat(CHAT_CAPTION_MAX + 10))).toHaveLength(CHAT_CAPTION_MAX);
  });
});
