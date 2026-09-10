import { describe, expect, it } from "vitest";
import { canComposeTaskChat, employeeOpensTaskChatFirst } from "./taskChatCompose";

describe("canComposeTaskChat", () => {
  it("allows oved before start, while working, or waiting for reply", () => {
    expect(canComposeTaskChat("pending", true)).toBe(true);
    expect(canComposeTaskChat("in_progress", true)).toBe(true);
    expect(canComposeTaskChat("overdue", true)).toBe(true);
    expect(canComposeTaskChat("awaiting_response", true)).toBe(true);
  });

  it("blocks oved when done or in photo review", () => {
    expect(canComposeTaskChat("completed", true)).toBe(false);
    expect(canComposeTaskChat("pending_review", true)).toBe(false);
  });

  it("allows menahel during review", () => {
    expect(canComposeTaskChat("pending_review", false)).toBe(true);
    expect(canComposeTaskChat("awaiting_response", false)).toBe(true);
    expect(canComposeTaskChat("completed", false)).toBe(false);
  });

  it("puts chat first when the oved opens a review or accepted task", () => {
    expect(employeeOpensTaskChatFirst("pending_review")).toBe(true);
    expect(employeeOpensTaskChatFirst("completed")).toBe(true);
    expect(employeeOpensTaskChatFirst("awaiting_response")).toBe(false);
    expect(employeeOpensTaskChatFirst("in_progress")).toBe(false);
  });
});
