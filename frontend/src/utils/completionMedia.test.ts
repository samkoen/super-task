import { describe, expect, it, vi } from "vitest";
import {
  addRequirement,
  effectiveRequirements,
  meetsCompletionMedia,
  meetsCompletionRequirements,
  normalizeMinVideoSeconds,
  normalizeRequirements,
  resolveRequirementExamples,
  setRequirementHint,
  setRequirementTitle,
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

  it("keeps title and example on visual slots only", () => {
    expect(
      normalizeRequirements([
        { kind: "photo", title: "  מדף  ", hint: "  כל השורה  ", example_url: "/a.jpg" },
        { kind: "audio", title: "no", hint: "no", example_url: "/x.jpg" },
      ]),
    ).toEqual([
      { kind: "photo", title: "מדף", hint: "כל השורה", example_url: "/a.jpg" },
      { kind: "audio" },
    ]);
  });

  it("keeps spaces while typing a slot title or hint", () => {
    const withSpace = setRequirementTitle([{ kind: "photo" }], 0, "מדף ");
    expect(withSpace[0].title).toBe("מדף ");
    expect(setRequirementHint(withSpace, 0, "לצלם את ")[0].hint).toBe("לצלם את ");
  });

  it("uploads pending example photos at resolve time", async () => {
    const file = new File(["x"], "ex.jpg", { type: "image/jpeg" });
    const upload = vi.fn(async () => ({ url: "/uploads/task_photos/ex.jpg" }));
    const resolved = await resolveRequirementExamples(
      [{ kind: "photo", title: "מדף", example_url: "blob:http://localhost/1", pending_example: file }],
      upload,
    );
    expect(upload).toHaveBeenCalledWith(file);
    expect(resolved).toEqual([
      { kind: "photo", title: "מדף", example_url: "/uploads/task_photos/ex.jpg" },
    ]);
  });
});
