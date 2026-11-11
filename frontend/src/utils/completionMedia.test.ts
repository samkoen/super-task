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
  sanitizeVideoSecondsDraft,
  clearRequirementGuideVideo,
  setRequirementGuideVideo,
  setRequirementHint,
  setRequirementTitle,
  setVideoSeconds,
  commitVideoSeconds,
  wordsToPhotoRequirements,
  type CompletionRequirement,
} from "./completionMedia";

describe("completionMedia", () => {
  it("normalizes empty and invalid to null", () => {
    expect(normalizeMinVideoSeconds("")).toBeNull();
    expect(normalizeMinVideoSeconds(0)).toBeNull();
    expect(normalizeMinVideoSeconds(8)).toBe(8);
  });

  it("lets the menahel clear min seconds while typing then set 36", () => {
    const list = [{ kind: "video" as const, min_seconds: 1 }];
    expect(setVideoSeconds(list, 0, "")).toEqual([{ kind: "video" }]);
    expect(setVideoSeconds(list, 0, "36")).toEqual([{ kind: "video", min_seconds: 36 }]);
    expect(sanitizeVideoSecondsDraft("36s")).toBe("36");
  });

  it("commits the default when min seconds is left empty", () => {
    expect(commitVideoSeconds([{ kind: "video" }], 0)).toEqual([
      { kind: "video", min_seconds: 10 },
    ]);
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

  it("keeps title and hint on audio, drops example", () => {
    expect(
      normalizeRequirements([
        { kind: "photo", title: "  מדף  ", hint: "  כל השורה  ", example_url: "/a.jpg" },
        { kind: "audio", title: "הקלטה", hint: "תאר", example_url: "/x.jpg" },
      ]),
    ).toEqual([
      { kind: "photo", title: "מדף", hint: "כל השורה", example_url: "/a.jpg" },
      { kind: "audio", title: "הקלטה", hint: "תאר" },
    ]);
  });

  it("keeps title and hint on a message and drops the example", () => {
    expect(
      normalizeRequirements([
        { kind: "message", title: "ספירה", hint: "כתבו", example_url: "/x.jpg" },
      ]),
    ).toEqual([{ kind: "message", title: "ספירה", hint: "כתבו" }]);
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
    expect(isWordPhotoSlot({ kind: "photo", title: "מדף", slot: true })).toBe(false);
    expect(
      editorDetailRequirements([
        { kind: "photo", title: "חלב" },
        { kind: "photo", title: "מדף", slot: true },
        { kind: "video", min_seconds: 10 },
      ]),
    ).toEqual([
      { req: { kind: "photo", title: "חלב" }, index: 0 },
      { req: { kind: "photo", title: "מדף", slot: true }, index: 1 },
      { req: { kind: "video", min_seconds: 10 }, index: 2 },
    ]);
  });

  it("keeps a +photo card when the word list changes", () => {
    const current = [
      { kind: "photo" as const, title: "מדף", slot: true },
      { kind: "video" as const, min_seconds: 10 },
    ];
    expect(applyWordPhotoSlots(current, ["חלב"])).toEqual([
      { kind: "photo", title: "חלב" },
      { kind: "photo", title: "מדף", slot: true },
      { kind: "video", min_seconds: 10 },
    ]);
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

  it("uploads the pending guide video and never sends a blob url", async () => {
    const file = new File(["x"], "how.mp4", { type: "video/mp4" });
    const uploadPhoto = vi.fn(async () => ({ url: "/p.jpg" }));
    const uploadVideo = vi.fn(async () => ({ url: "/uploads/task_videos/how.mp4" }));
    const resolved = await resolveRequirementExamples(
      [
        { kind: "video", min_seconds: 10, guide_video_url: "blob:http://localhost/2", pending_guide_video: file },
        { kind: "photo", guide_video_url: "blob:http://localhost/3" },
        { kind: "audio", guide_video_url: "/ignored.mp4" },
      ],
      uploadPhoto,
      uploadVideo,
    );
    expect(uploadVideo).toHaveBeenCalledTimes(1);
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(resolved[0].guide_video_url).toBe("/uploads/task_videos/how.mp4");
    expect(resolved[1].guide_video_url).toBeUndefined();
    expect(resolved[2].guide_video_url).toBeUndefined();
  });

  it("keeps a saved guide video through normalization and treats it as a guide", () => {
    const [req] = normalizeRequirements([{ kind: "photo", guide_video_url: " /v.mp4 " }]);
    expect(req.guide_video_url).toBe("/v.mp4");
    const list = [{ kind: "photo" as const, guide_video_url: "/v.mp4" }];
    expect(effectiveRequirements({ completion_requirements: list })).toEqual(list);
  });

  it("sets and clears the guide video of one card, except audio and message", () => {
    const file = new File(["x"], "how.mp4", { type: "video/mp4" });
    const list: CompletionRequirement[] = [{ kind: "video", min_seconds: 10 }, { kind: "audio" }];
    const set = setRequirementGuideVideo(list, 0, "blob:v", file);
    expect(set[0].guide_video_url).toBe("blob:v");
    expect(set[0].pending_guide_video).toBe(file);
    expect(setRequirementGuideVideo(list, 1, "blob:v", file)[1]).toEqual({ kind: "audio" });
    expect(clearRequirementGuideVideo(set, 0)[0]).toEqual({ kind: "video", min_seconds: 10 });
  });
});
