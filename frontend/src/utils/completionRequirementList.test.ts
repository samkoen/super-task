import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  nextOpenIndexAfterRemove,
  requirementKindLabel,
  requirementRowLabel,
  requirementRowName,
} from "./completionRequirementList";

describe("completionRequirementList", () => {
  it("labels a named row as name: kind", () => {
    expect(requirementRowName({ kind: "photo", title: "חלב" })).toBe("חלב");
    expect(requirementRowLabel({ kind: "photo", title: "חלב" })).toBe(
      `חלב: ${he.completionReqPhoto}`,
    );
    expect(requirementRowLabel({ kind: "video", title: "עגבניה" })).toBe(
      `עגבניה: ${he.completionReqVideo}`,
    );
    expect(requirementKindLabel("audio")).toBe(he.completionReqAudio);
  });

  it("uses untitled when the slot has no name", () => {
    expect(requirementRowLabel({ kind: "photo" })).toBe(
      `${he.completionUntitledSlot}: ${he.completionReqPhoto}`,
    );
  });

  it("closes or shifts the open index after a delete", () => {
    expect(nextOpenIndexAfterRemove(null, 0)).toBeNull();
    expect(nextOpenIndexAfterRemove(1, 1)).toBeNull();
    expect(nextOpenIndexAfterRemove(2, 0)).toBe(1);
    expect(nextOpenIndexAfterRemove(0, 2)).toBe(0);
  });
});
