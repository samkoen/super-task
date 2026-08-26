import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { directChatTitle, sortDirectChatCards } from "./directChat";
import type { DirectChatCard } from "../services/directChatService";

function card(overrides: Partial<DirectChatCard> = {}): DirectChatCard {
  return {
    id: "c1",
    kind: "down",
    counterpart_user_id: "e1",
    counterpart_name: "דן",
    counterpart_role: "employee",
    last_preview: "שלום",
    last_at: "2026-08-26T10:00:00+03:00",
    unread_count: 0,
    ...overrides,
  };
}

describe("directChat", () => {
  it("titles the upward thread as the manager", () => {
    expect(directChatTitle(card({ kind: "up", counterpart_name: "רשת לוי" }))).toBe(
      he.directChatManagerTitle,
    );
    expect(directChatTitle(card())).toBe("דן");
  });

  it("sorts threads with recent messages first", () => {
    const empty = card({ id: "c0", last_at: null, counterpart_name: "ריק" });
    const older = card({ id: "c2", last_at: "2026-08-26T08:00:00+03:00" });
    const newer = card({ id: "c3", last_at: "2026-08-26T12:00:00+03:00" });
    expect(sortDirectChatCards([empty, older, newer]).map((c) => c.id)).toEqual(["c3", "c2", "c0"]);
  });
});
