import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  chatDayLabel,
  chatThreadItems,
  formatChatDayBadge,
  messageDayKey,
} from "./chatDay";
import { formatDateIso, shiftDay } from "./dateView";
import type { ChatMessageView } from "./chatMessageView";

const NOW = new Date("2026-09-04T12:00:00+03:00");

function msg(id: string, created_at: string): ChatMessageView {
  return { id, sender_user_id: "u1", body: id, created_at };
}

describe("chatDay", () => {
  it("uses the local calendar day of the message", () => {
    const stamp = "2026-07-23T12:00:00+03:00";
    expect(messageDayKey(stamp)).toBe(formatDateIso(new Date(stamp)));
    expect(messageDayKey("not-a-date")).toBe("");
  });

  it("labels today, yesterday, and older days", () => {
    const today = formatDateIso(NOW);
    expect(chatDayLabel(today, NOW)).toBe(he.chatDayToday);
    expect(chatDayLabel(shiftDay(today, -1), NOW)).toBe(he.chatDayYesterday);
    expect(chatDayLabel("2026-07-23", NOW)).toBe(formatChatDayBadge("2026-07-23"));
    expect(formatChatDayBadge("2026-07-23")).toMatch(/23/);
    expect(formatChatDayBadge("2026-07-23")).toMatch(/2026/);
  });

  it("inserts one chip per day in the thread", () => {
    const older = "2026-07-23T12:00:00+03:00";
    const todayStamp = "2026-09-04T12:00:00+03:00";
    const items = chatThreadItems(
      [msg("a", older), msg("b", older), msg("c", todayStamp)],
      NOW,
    );
    const days = items.filter((item) => item.kind === "day");
    expect(days).toEqual([
      {
        kind: "day",
        day: messageDayKey(older),
        label: formatChatDayBadge(messageDayKey(older)),
      },
      {
        kind: "day",
        day: messageDayKey(todayStamp),
        label: chatDayLabel(messageDayKey(todayStamp), NOW),
      },
    ]);
    expect(items.filter((item) => item.kind === "message")).toHaveLength(3);
  });
});
