import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { completionFinishedText, taskFinishedAtText } from "./completionFinishedAt";

describe("completionFinishedText", () => {
  it("labels the siyum time", () => {
    const text = completionFinishedText("2026-08-25T12:00:00+03:00");
    expect(text?.startsWith(`${he.markDone}:`)).toBe(true);
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns null for an empty or invalid time", () => {
    expect(completionFinishedText(null)).toBeNull();
    expect(completionFinishedText("")).toBeNull();
    expect(completionFinishedText("pas-une-date")).toBeNull();
  });
});

describe("taskFinishedAtText", () => {
  it("shows the time while the task is in review", () => {
    const text = taskFinishedAtText({
      status: "pending_review",
      completion: { completed_at: "2026-08-25T12:00:00+03:00" },
    });
    expect(text?.startsWith(`${he.markDone}:`)).toBe(true);
  });

  it("hides a stale time after the menahel reopens the task", () => {
    expect(
      taskFinishedAtText({
        status: "in_progress",
        completion: { completed_at: "2026-08-25T12:00:00+03:00" },
      }),
    ).toBeNull();
  });
});
