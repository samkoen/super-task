import { describe, expect, it } from "vitest";
import { emptyManagerMyWork, managerUnreadDirectChats } from "./managerUnreadChats";
import type { DirectChatCard, DirectChatInbox } from "../services/directChatService";

function card(id: string, unread: number): DirectChatCard {
  return {
    id: `c-${id}`,
    kind: "down",
    counterpart_user_id: id,
    counterpart_name: id,
    counterpart_role: "employee",
    last_preview: "שלום",
    last_at: "2026-09-19T10:00:00+03:00",
    unread_count: unread,
  };
}

function inbox(partial: Partial<DirectChatInbox>): DirectChatInbox {
  return { items: [], up: null, unread_count: 0, ...partial };
}

describe("managerUnreadDirectChats", () => {
  it("keeps unread downward chats and the up card", () => {
    const up = { ...card("nm", 2), kind: "up" as const };
    const result = managerUnreadDirectChats(
      inbox({ items: [card("e1", 1), card("e2", 0)], up }),
    );
    expect(result.map((c) => c.counterpart_user_id)).toEqual(["e1", "nm"]);
  });

  it("returns empty without inbox", () => {
    expect(managerUnreadDirectChats(null)).toEqual([]);
    expect(emptyManagerMyWork().today_tasks).toEqual([]);
  });
});
