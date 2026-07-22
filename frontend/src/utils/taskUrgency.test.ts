import { describe, expect, it } from "vitest";
import { taskUrgencyLevel } from "./taskUrgency";

describe("taskUrgencyLevel", () => {
  const now = Date.parse("2026-07-22T12:00:00.000Z");

  it("marks overdue status and past due", () => {
    expect(taskUrgencyLevel("overdue", "2026-07-22T18:00:00.000Z", now)).toBe("overdue");
    expect(taskUrgencyLevel("pending", "2026-07-22T10:00:00.000Z", now)).toBe("overdue");
  });

  it("marks soon within 24h", () => {
    expect(taskUrgencyLevel("pending", "2026-07-23T06:00:00.000Z", now)).toBe("soon");
  });

  it("marks normal and done", () => {
    expect(taskUrgencyLevel("pending", "2026-07-25T12:00:00.000Z", now)).toBe("normal");
    expect(taskUrgencyLevel("completed", "2026-07-21T12:00:00.000Z", now)).toBe("done");
  });
});
