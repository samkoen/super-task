import { describe, expect, it } from "vitest";
import {
  datetimeLocalToIso,
  followUpIsPending,
  isContinuousChatTask,
  isOpenChatTask,
  isPendingFollowUpTask,
} from "./chatTaskFollowUp";

const NOW = new Date("2026-08-29T22:00:00+03:00").getTime();

describe("chatTaskFollowUp", () => {
  it("treats an unread awaiting message as an open task", () => {
    expect(isOpenChatTask("awaiting_response", null)).toBe(true);
    expect(isOpenChatTask("awaiting_response", "2026-08-29T21:00:00+03:00")).toBe(false);
  });

  it("parks a future follow-up in pending, not on the continuous row", () => {
    const task = {
      status: "awaiting_response" as const,
      segment: "awaiting_response" as const,
      chat_follow_up_at: "2026-08-30T10:00:00+03:00",
      chat_resolved_at: null,
    };
    expect(isPendingFollowUpTask(task, NOW)).toBe(true);
    expect(isContinuousChatTask(task, NOW)).toBe(false);
  });

  it("returns a due follow-up to the continuous row", () => {
    const task = {
      status: "awaiting_response" as const,
      segment: "awaiting_response" as const,
      chat_follow_up_at: "2026-08-29T21:00:00+03:00",
      chat_resolved_at: null,
    };
    expect(isContinuousChatTask(task, NOW)).toBe(true);
    expect(followUpIsPending(task.chat_follow_up_at, NOW)).toBe(false);
  });

  it("does not treat viewing time as a close signal", () => {
    expect(datetimeLocalToIso("2026-08-30T10:00")).toBeTruthy();
    expect(datetimeLocalToIso("")).toBeNull();
  });
});
