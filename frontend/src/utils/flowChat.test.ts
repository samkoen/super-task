import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { composerPlaceholder, slotThreadMessages, stepTagLabel } from "./flowChat";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "מקרר" },
];

describe("stepTagLabel", () => {
  it("is the sub-task title", () => {
    expect(stepTagLabel(reqs, 1)).toBe("מקרר");
  });

  it("is null for a general message or a vanished step", () => {
    expect(stepTagLabel(reqs, null)).toBeNull();
    expect(stepTagLabel(reqs, undefined)).toBeNull();
    expect(stepTagLabel(reqs, 9)).toBeNull();
  });
});

describe("composerPlaceholder", () => {
  it("names the selected video", () => {
    expect(composerPlaceholder(reqs, 1)).toBe(he.flowChatPlaceholderTopic("מקרר"));
  });

  it("falls back to the plain placeholder without a selection", () => {
    expect(composerPlaceholder(reqs, null)).toBe(he.flowChatPlaceholder);
  });
});

describe("slotThreadMessages", () => {
  it("keeps this sub-task's messages and the general ones, drops other sub-tasks", () => {
    const msgs = [{ id: "a" }, { id: "b", slot_index: 1 }, { id: "c", slot_index: 0 }, { id: "d", slot_index: null }];
    expect(slotThreadMessages(msgs, 1).map((m) => m.id)).toEqual(["a", "b", "d"]);
  });
});
