import { describe, expect, it } from "vitest";
import { canComposeTaskChat } from "./taskChatCompose";

describe("canComposeTaskChat", () => {
  it("allows oved while working or waiting for reply", () => {
    expect(canComposeTaskChat("in_progress", true)).toBe(true);
    expect(canComposeTaskChat("overdue", true)).toBe(true);
    expect(canComposeTaskChat("awaiting_response", true)).toBe(true);
  });

  it("blocks oved when pending or done", () => {
    expect(canComposeTaskChat("pending", true)).toBe(false);
    expect(canComposeTaskChat("completed", true)).toBe(false);
    expect(canComposeTaskChat("pending_review", true)).toBe(false);
  });

  it("allows menahel during review", () => {
    expect(canComposeTaskChat("pending_review", false)).toBe(true);
    expect(canComposeTaskChat("awaiting_response", false)).toBe(true);
    expect(canComposeTaskChat("completed", false)).toBe(false);
  });
});
