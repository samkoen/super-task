import { describe, expect, it, vi } from "vitest";
import {
  addRequirement,
  applyWordPhotoSlots,
  editorDetailRequirements,
  isWordPhotoSlot,
  effectiveRequirements,
  meetsCompletionMedia,
  meetsCompletionRequirements,
  normalizeMinVideoSeconds,
  normalizeRequirements,
  parseRequirementWords,
  resolveRequirementExamples,
  setRequirementHint,
  setRequirementTitle,
  wordsToPhotoRequirements,
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

  it("drops a migrated bare photo when the old task did not require one", () => {
    expect(
      effectiveRequirements({
        completion_requirements: [{ kind: "photo" }],
        photo_required: false,
      }),
    ).toEqual([]);
  });

  it("keeps a photo slot when the manager required it or named it", () => {
    expect(
      effectiveRequirements({
        completion_requirements: [{ kind: "photo" }],
        photo_required: true,
      }),
    ).toEqual([{ kind: "photo" }]);
    expect(
      effectiveRequirements({
        completion_requirements: [{ kind: "photo", title: "מדף" }],
        photo_required: false,
      }),
    ).toEqual([{ kind: "photo", title: "מדף" }]);
  });

  it("uses legacy flags when the API has no requirements list", () => {
    expect(effectiveRequirements({ photo_required: false })).toEqual([]);
    expect(effectiveRequirements({ photo_required: true })).toEqual([{ kind: "photo" }]);
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

  it("parses words, trims, dedupes, and caps title and count", () => {
    const long = "א".repeat(90);
    expect(parseRequirementWords(`  חלב \n\nלחם,חלב,${long}`)).toEqual([
      "חלב",
      "לחם",
      "א".repeat(80),
    ]);
    expect(parseRequirementWords("a\n".repeat(12))).toHaveLength(1);
    expect(parseRequirementWords(Array.from({ length: 12 }, (_, i) => `w${i}`).join("\n"))).toHaveLength(10);
  });

  it("turns a word list into named photo slots", () => {
    expect(wordsToPhotoRequirements([" חלב ", "לחם", "חלב"])).toEqual([
      { kind: "photo", title: "חלב" },
      { kind: "photo", title: "לחם" },
    ]);
  });

  it("keeps video and slot extras when the word list changes", () => {
    const current = [
      { kind: "photo" as const, title: "חלב", hint: "קר" },
      { kind: "video" as const, min_seconds: 10 },
    ];
    expect(applyWordPhotoSlots(current, ["חלב", "לחם"])).toEqual([
      { kind: "photo", title: "חלב", hint: "קר" },
      { kind: "photo", title: "לחם" },
      { kind: "video", min_seconds: 10 },
    ]);
    expect(applyWordPhotoSlots(current, [])).toEqual([{ kind: "video", min_seconds: 10 }]);
    expect(isWordPhotoSlot({ kind: "photo", title: "חלב" })).toBe(true);
    expect(isWordPhotoSlot({ kind: "photo" })).toBe(false);
    expect(
      editorDetailRequirements([
        { kind: "photo", title: "חלב" },
        { kind: "video", min_seconds: 10 },
      ]),
    ).toEqual([{ req: { kind: "video", min_seconds: 10 }, index: 1 }]);
  });

  it("blocks finish until every word has a photo", () => {
    const reqs = wordsToPhotoRequirements(["חלב", "לחם", "ביצים"]);
    expect(meetsCompletionRequirements(reqs, [{ kind: "photo" }, { kind: "photo" }])).toBe(false);
    expect(
      meetsCompletionRequirements(reqs, [{ kind: "photo" }, { kind: "photo" }, { kind: "photo" }]),
    ).toBe(true);
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
