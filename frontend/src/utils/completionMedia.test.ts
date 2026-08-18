import { describe, expect, it } from "vitest";
import {
  addRequirement,
  effectiveRequirements,
  meetsCompletionMedia,
  meetsCompletionRequirements,
  normalizeMinVideoSeconds,
} from "./completionMedia";

describe("completionMedia", () => {
  it("normalizes empty and invalid to null", () => {
    expect(normalizeMinVideoSeconds("")).toBeNull();
    expect(normalizeMinVideoSeconds(0)).toBeNull();
    expect(normalizeMinVideoSeconds(8)).toBe(8);
  });

  it("photo or video is enough without min duration", () => {
    expect(meetsCompletionMedia({ hasPhoto: true, hasVideo: false, videoSeconds: null, minVideoSeconds: null })).toBe(true);
    expect(meetsCompletionMedia({ hasPhoto: false, hasVideo: true, videoSeconds: 1, minVideoSeconds: null })).toBe(true);
    expect(meetsCompletionMedia({ hasPhoto: false, hasVideo: false, videoSeconds: null, minVideoSeconds: null })).toBe(false);
  });

  it("requires video length when min is set", () => {
    expect(
      meetsCompletionMedia({ hasPhoto: true, hasVideo: false, videoSeconds: null, minVideoSeconds: 5 }),
    ).toBe(false);
    expect(
      meetsCompletionMedia({ hasPhoto: false, hasVideo: true, videoSeconds: 4, minVideoSeconds: 5 }),
    ).toBe(false);
    expect(
      meetsCompletionMedia({ hasPhoto: false, hasVideo: true, videoSeconds: 5, minVideoSeconds: 5 }),
    ).toBe(true);
  });

  it("empty requirements list allows submit without files", () => {
    expect(meetsCompletionRequirements([], [])).toBe(true);
  });

  it("requires every slot including a second video", () => {
    const reqs = addRequirement(addRequirement([], "video"), "video");
    expect(
      meetsCompletionRequirements(reqs, [{ kind: "video", durationSeconds: 10 }]),
    ).toBe(false);
  });

  it("keeps an explicit empty list from the API", () => {
    expect(effectiveRequirements({ completion_requirements: [] })).toEqual([]);
  });
});
