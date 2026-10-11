import { describe, expect, it } from "vitest";
import { dashboardTaskUsesReview } from "./dashboardTaskOpen";

describe("dashboardTaskUsesReview", () => {
  it("opens the review window for ichour and for an already closed task", () => {
    expect(dashboardTaskUsesReview("pending_review")).toBe(true);
    expect(dashboardTaskUsesReview("completed")).toBe(true);
  });

  it("keeps an open task on the edit window", () => {
    expect(dashboardTaskUsesReview("in_progress")).toBe(false);
    expect(dashboardTaskUsesReview("pending")).toBe(false);
    expect(dashboardTaskUsesReview("overdue")).toBe(false);
  });
});
