import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  completionOutcomeLabel,
  employeeCompletePayload,
  incompleteReasonError,
  isTaskNotCompleted,
  shouldPromptIncomplete,
} from "./employeeIncompleteSubmit";

describe("employeeIncompleteSubmit", () => {
  it("asks for a reason when the oved sends without finishing", () => {
    expect(shouldPromptIncomplete(false, false)).toBe(true);
    expect(shouldPromptIncomplete(true, false)).toBe(false);
    expect(shouldPromptIncomplete(false, true)).toBe(false);
    expect(incompleteReasonError("")).toBe(he.incompleteTaskReasonRequired);
    expect(incompleteReasonError("   ")).toBe(he.incompleteTaskReasonRequired);
    expect(incompleteReasonError("אין מה לצלם")).toBe("");
  });

  it("sends not_completed with the explanation", () => {
    expect(
      employeeCompletePayload({
        slotsFilled: false,
        note: "",
        attachments: [],
        incompleteReason: "  אין מה לצלם ",
      }),
    ).toEqual({
      status: "not_completed",
      note: undefined,
      not_completed_reason: "אין מה לצלם",
      completion_attachments: undefined,
    });
    expect(
      employeeCompletePayload({
        slotsFilled: true,
        note: "בוצע",
        attachments: [{ kind: "photo", url: "/p.jpg" }],
      }),
    ).toEqual({
      status: "completed",
      note: "בוצע",
      completion_attachments: [{ kind: "photo", url: "/p.jpg" }],
    });
  });

  it("labels בוצע versus לא בוצע for the menahel", () => {
    expect(isTaskNotCompleted("not_completed")).toBe(true);
    expect(isTaskNotCompleted("completed")).toBe(false);
    expect(completionOutcomeLabel("not_completed")).toBe(he.taskNotCompleted);
    expect(completionOutcomeLabel("completed")).toBe(he.taskCompleted);
  });
});
