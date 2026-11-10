import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { chatDraftFor, subtaskChoices } from "./flowChat";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "photo" as const, title: "" },
];

describe("subtaskChoices", () => {
  it("starts with the general choice then one per configured subtask", () => {
    const choices = subtaskChoices(reqs);
    expect(choices[0]).toEqual({ index: null, label: he.flowChatGeneral });
    expect(choices).toHaveLength(3);
    expect(choices[1].label).toBe("גיבוי");
  });

  it("only offers the general choice without subtasks", () => {
    expect(subtaskChoices([])).toHaveLength(1);
  });
});

describe("chatDraftFor", () => {
  it("writes the question about the chosen subtask", () => {
    expect(chatDraftFor(reqs, 0)).toBe(he.subtaskQuestionDraft("גיבוי"));
  });

  it("has no draft for the general choice or an unknown index", () => {
    expect(chatDraftFor(reqs, null)).toBeUndefined();
    expect(chatDraftFor(reqs, 9)).toBeUndefined();
  });
});
