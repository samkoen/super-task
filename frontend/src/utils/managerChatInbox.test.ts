import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import {
  buildManagerEmployeeRows,
  directUnreadOf,
  filterManagerContacts,
} from "./managerChatInbox";

function card(overrides: Partial<DirectChatCard> = {}): DirectChatCard {
  return {
    id: "c1",
    kind: "down",
    counterpart_user_id: "e1",
    counterpart_name: "דן כהן",
    counterpart_role: "employee",
    branch_name: "תל אביב",
    last_preview: "שלום",
    last_at: "2026-09-14T10:00:00+03:00",
    unread_count: 3,
    direct_unread_count: 1,
    task_unread_count: 2,
    ...overrides,
  };
}

describe("managerChatInbox", () => {
  it("filters contacts by name or branch", () => {
    const dan = card();
    const noa = card({
      counterpart_user_id: "e2",
      counterpart_name: "נועה",
      branch_name: "חיפה",
    });
    expect(filterManagerContacts([dan, noa], "כהן").map((c) => c.counterpart_user_id)).toEqual(["e1"]);
    expect(filterManagerContacts([dan, noa], "חיפה").map((c) => c.counterpart_user_id)).toEqual(["e2"]);
    expect(filterManagerContacts([dan, noa], "  ").length).toBe(2);
  });

  it("returns empty when search matches nothing", () => {
    expect(filterManagerContacts([card()], "ירושלים")).toEqual([]);
  });

  it("uses direct unread for the general row", () => {
    expect(directUnreadOf(card())).toBe(1);
    const rows = buildManagerEmployeeRows(card(), [
      {
        id: "o1",
        title: "מדף",
        status: "in_progress",
        last_preview: "היי",
        last_at: "2026-09-14T11:00:00+03:00",
        unread_count: 2,
      },
    ]);
    expect(rows[0]).toMatchObject({ kind: "general", title: he.employeeGeneralChat, unread_count: 1 });
    expect(rows[1]).toMatchObject({ kind: "task", id: "o1", unread_count: 2 });
  });
});
