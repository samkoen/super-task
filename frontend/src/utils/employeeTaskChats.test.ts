import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import { buildEmployeeChatRows, generalChatSummary, taskChatListTitle } from "./employeeTaskChats";
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
    expect(rows[1].title).toBe(`מדף · ${formatChatDayBadge(messageDayKey(first))}`);
    expect(rows[2].title).toBe(`מדף · ${formatChatDayBadge(messageDayKey(second))}`);
    expect(rows[1].title).not.toBe(rows[2].title);
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
});
