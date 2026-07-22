import { describe, expect, it } from "vitest";
import type { TaskStatus } from "../services/taskService";

/** Miroir des règles backend pour le CTA chat oved. */
function canEmployeeChat(status: TaskStatus): boolean {
  return status === "in_progress" || status === "overdue" || status === "awaiting_response";
}

describe("taskChat rules", () => {
  it("allows chat for in_progress / overdue / awaiting_response", () => {
    expect(canEmployeeChat("in_progress")).toBe(true);
    expect(canEmployeeChat("awaiting_response")).toBe(true);
    expect(canEmployeeChat("pending_review")).toBe(false);
    expect(canEmployeeChat("completed")).toBe(false);
  });
});
