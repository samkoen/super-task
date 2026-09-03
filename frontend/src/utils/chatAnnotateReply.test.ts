import { describe, expect, it } from "vitest";
import { canAnnotateChatReply } from "./chatAnnotateReply";

describe("canAnnotateChatReply", () => {
  it("allows annotating a received photo when compose is open", () => {
    expect(canAnnotateChatReply(true, false)).toBe(true);
  });

  it("hides the action on own photos or when compose is closed", () => {
    expect(canAnnotateChatReply(true, true)).toBe(false);
    expect(canAnnotateChatReply(false, false)).toBe(false);
  });
});
