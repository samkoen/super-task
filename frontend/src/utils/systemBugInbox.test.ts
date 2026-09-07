import { describe, expect, it } from "vitest";
import { canViewSystemBugInbox, isSystemBugOpen, normalizePersonName } from "./systemBugInbox";

describe("canViewSystemBugInbox", () => {
  it("allows יצחק with or without geresh", () => {
    expect(normalizePersonName("יצחק ריצ'רד")).toBe("יצחק ריצרד");
    expect(canViewSystemBugInbox({ full_name: "יצחק ריצרד" })).toBe(true);
    expect(canViewSystemBugInbox({ first_name: "יצחק", last_name: "ריצ'רד" })).toBe(true);
  });

  it("denies other users unless flagged", () => {
    expect(canViewSystemBugInbox({ full_name: "דני כהן" })).toBe(false);
    expect(canViewSystemBugInbox(null)).toBe(false);
    expect(canViewSystemBugInbox({ full_name: "דני", can_view_system_bug_inbox: true })).toBe(
      true,
    );
  });
});

describe("isSystemBugOpen", () => {
  it("treats missing status as open", () => {
    expect(isSystemBugOpen()).toBe(true);
    expect(isSystemBugOpen("open")).toBe(true);
    expect(isSystemBugOpen("closed")).toBe(false);
  });
});
