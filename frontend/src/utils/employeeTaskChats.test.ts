import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import {
  buildEmployeeChatRows,
  chatNeedsAction,
  employeeTaskChatTitle,
  filterEmployeeChatRows,
  generalChatIdentity,
  generalChatSummary,
  taskChatListTitle,
} from "./employeeTaskChats";
import { formatChatDayBadge, messageDayKey } from "./chatDay";

function manager(over: Partial<DirectChatCard> = {}): DirectChatCard {
  return {
    id: "c1",
    kind: "up",
    counterpart_user_id: "m1",
    counterpart_name: "מנהל",
    counterpart_role: "branch_manager",
    last_preview: null,
    last_at: null,
    unread_count: 0,
    ...over,
  };
}

describe("employeeTaskChats", () => {
  it("pins the general chat first", () => {
    const rows = buildEmployeeChatRows(
      { last_preview: "שלום", last_at: "2026-09-07T08:00:00+03:00", unread_count: 2 },
      [
        {
          id: "t1",
          title: "מדף",
          status: "in_progress",
          last_preview: "שאלה",
          last_at: "2026-09-07T10:00:00+03:00",
        },
      ],
    );
    expect(rows[0]).toMatchObject({ kind: "general", title: he.employeeGeneralChat, unread_count: 2 });
    expect(rows[1]).toMatchObject({
      kind: "task",
      id: "t1",
      title: taskChatListTitle("מדף", "2026-09-07T10:00:00+03:00"),
    });
  });

  it("appends the task day to identical recurring titles", () => {
    const first = "2026-09-16T08:00:00+03:00";
    const second = "2026-09-17T08:00:00+03:00";
    const rows = buildEmployeeChatRows({ last_preview: null, last_at: null, unread_count: 0 }, [
      { id: "t1", title: "מדף", status: "in_progress", due_at: first, last_preview: null, last_at: first },
      { id: "t2", title: "מדף", status: "in_progress", due_at: second, last_preview: null, last_at: second },
    ]);
    // Le plus récent d'abord ; la date distingue deux fils du même titre.
    expect(rows[1].title).toBe(`מדף · ${formatChatDayBadge(messageDayKey(second))}`);
    expect(rows[2].title).toBe(`מדף · ${formatChatDayBadge(messageDayKey(first))}`);
  });

  it("summarizes several manager threads into one general row", () => {
    const summary = generalChatSummary([
      manager({ last_preview: "ישן", last_at: "2026-09-07T08:00:00+03:00", unread_count: 1 }),
      manager({
        id: "c2",
        last_preview: "חדש",
        last_at: "2026-09-07T11:00:00+03:00",
        unread_count: 3,
        scope: "network",
      }),
    ]);
    expect(summary).toEqual({
      last_preview: "חדש",
      last_at: "2026-09-07T11:00:00+03:00",
      unread_count: 4,
    });
  });

  it("names the general chat after a single manager", () => {
    expect(generalChatIdentity([manager({ counterpart_name: "רונית כהן" })])).toEqual({
      title: he.employeeGeneralChatWith("רונית כהן"),
      initials: "רכ",
    });
    expect(generalChatIdentity([manager(), manager({ id: "c2" })]).title).toBe(he.employeeGeneralChat);
  });

  it("drops the date for today's shift", () => {
    const today = new Date("2026-09-07T12:00:00+03:00");
    expect(
      employeeTaskChatTitle({ title: "מדף", due_at: "2026-09-07T08:00:00+03:00", last_at: null }, today),
    ).toBe("מדף");
  });

  it("filters by action, pending and approved, and searches title or preview", () => {
    const at = "2026-09-07T10:00:00+03:00";
    const rows = buildEmployeeChatRows({ last_preview: null, last_at: null, unread_count: 0 }, [
      { id: "unread", title: "א", status: "in_progress", last_preview: "חלב", last_at: at, unread_count: 1 },
      { id: "retake", title: "ב", status: "in_progress", last_preview: null, last_at: at, chat_status: "retake" },
      { id: "pending", title: "ג", status: "pending_review", last_preview: null, last_at: at, chat_status: "pending_review" },
      { id: "ok", title: "ד", status: "completed", last_preview: null, last_at: at, chat_status: "approved" },
    ]);
    const ids = (list: typeof rows) => list.map((row) => (row.kind === "task" ? row.id : "general"));
    expect(rows.filter(chatNeedsAction).length).toBe(2);
    expect(ids(filterEmployeeChatRows(rows, "action", ""))).toEqual(["unread", "retake"]);
    expect(ids(filterEmployeeChatRows(rows, "pending", ""))).toEqual(["pending"]);
    expect(ids(filterEmployeeChatRows(rows, "approved", ""))).toEqual(["ok"]);
    expect(ids(filterEmployeeChatRows(rows, "all", "חלב"))).toEqual(["unread"]);
  });
});
