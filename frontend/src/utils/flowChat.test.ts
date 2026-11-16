import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { composerPlaceholder, stepTagLabel, topicChoices } from "./flowChat";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "מקרר" },
];

describe("topicChoices", () => {
  it("one pill per sub-task, titled like the card, with no general pill", () => {
    expect(topicChoices(reqs, ["idle", "idle"])).toEqual([
      { index: 0, label: "גיבוי", done: false },
      { index: 1, label: "מקרר", done: false },
    ]);
  });

  it("marks a pill done once its card is handed over, sent or skipped", () => {
    const done = topicChoices(reqs, ["sent", "skipped"]).map((c) => c.done);
    expect(done).toEqual([true, true]);
    expect(topicChoices(reqs, ["ready", "idle"]).map((c) => c.done)).toEqual([true, false]);
  });

  it("is empty when the task has no sub-task", () => {
    expect(topicChoices([], [])).toEqual([]);
  });

  it("treats a missing status as not done", () => {
    expect(topicChoices(reqs, []).map((c) => c.done)).toEqual([false, false]);
  });
});

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
