import { describe, expect, it } from "vitest";
import {
  datetimeLocalToIso,
  followUpIsPending,
  chatNeedsManagerAttention,
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

  it("hides a chat the manager already opened, until the employee writes again", () => {
    const opened = {
      status: "awaiting_response" as const,
      segment: "awaiting_response" as const,
      chat_follow_up_at: null,
      chat_resolved_at: null,
      chat_unread_count: 0,
    };
    const fresh = { ...opened, chat_unread_count: 1 };
    expect(chatNeedsManagerAttention(opened, NOW)).toBe(false);
    expect(chatNeedsManagerAttention(fresh, NOW)).toBe(true);
  });

  it("keeps a due reminder even after the manager opened the chat", () => {
    const task = {
      status: "awaiting_response" as const,
      segment: "awaiting_response" as const,
      chat_follow_up_at: "2026-08-29T21:00:00+03:00",
      chat_resolved_at: null,
      chat_unread_count: 0,
    };
    expect(chatNeedsManagerAttention(task, NOW)).toBe(true);
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
