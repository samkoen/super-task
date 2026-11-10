import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { chatProgress, chatStatusText, stepChoices, stepTagLabel } from "./flowChat";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "photo" as const, title: "מקרר" },
];

describe("stepChoices", () => {
  it("lists « כללי » first, then one numbered chip per subtask", () => {
    expect(stepChoices(reqs)).toEqual([
      { index: null, label: he.flowChatGeneral },
      { index: 0, label: he.flowChatChip(1, "גיבוי") },
      { index: 1, label: he.flowChatChip(2, "מקרר") },
    ]);
  });

  it("only offers the general choice when the task has no subtask", () => {
    expect(stepChoices([])).toHaveLength(1);
  });
});

describe("stepTagLabel", () => {
  it("labels a message with its step number and title", () => {
    expect(stepTagLabel(reqs, 1)).toBe(he.flowChatStepTag(2, "מקרר"));
  });

  it("returns null for a general message or a step that no longer exists", () => {
    expect(stepTagLabel(reqs, null)).toBeNull();
    expect(stepTagLabel(reqs, undefined)).toBeNull();
    expect(stepTagLabel(reqs, 9)).toBeNull();
  });
});

describe("chatProgress", () => {
  it("marks handed-over cards done and the first remaining one current", () => {
    const progress = chatProgress(["sent", "idle", "idle", "idle"]);
    expect(progress.bars).toEqual(["done", "current", "todo", "todo"]);
    expect(progress.current).toBe(1);
    expect(chatStatusText(progress)).toBe(he.flowChatStatus(2, 4));
  });

  it("counts kept (not yet sent) cards as done", () => {
    expect(chatProgress(["ready", "queued", "idle"]).bars).toEqual(["done", "done", "current"]);
  });

  it("reports every step done when nothing is left", () => {
    const progress = chatProgress(["sent", "ready"]);
    expect(progress.current).toBeNull();
    expect(chatStatusText(progress)).toBe(he.flowChatStatusAllDone);
  });

  it("falls back to a plain status without subtasks", () => {
    expect(chatStatusText(chatProgress([]))).toBe(he.flowChatStatusPlain);
  });
});
