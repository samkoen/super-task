import { describe, expect, it, vi } from "vitest";
import { guideFromRequirement, taskSpeechText } from "./captureGuide";

vi.mock("./mediaUrl", () => ({ mediaUrl: (path: string | null) => path }));

describe("guideFromRequirement", () => {
  it("carries the manager's title, hint and example image", () => {
    const guide = guideFromRequirement(
      { kind: "photo", title: "מדף חלב", hint: "כל המדף", example_url: "/example.jpg" },
      0,
    );
    expect(guide).toEqual({ title: "מדף חלב", hint: "כל המדף", exampleSrc: "/example.jpg" });
  });

  it("omits the hint and example when the manager gave none", () => {
    const guide = guideFromRequirement({ kind: "video", title: "קופה", min_seconds: 10 }, 1);
    expect(guide.hint).toBeUndefined();
    expect(guide.exampleSrc).toBeUndefined();
  });

  it("never shows an example for audio steps", () => {
    const guide = guideFromRequirement({ kind: "audio", title: "הקלטה", example_url: "/x.jpg" }, 0);
    expect(guide.exampleSrc).toBeUndefined();
  });
});

describe("taskSpeechText", () => {
  it("joins the title and the instruction", () => {
    expect(taskSpeechText("פתיחת קופה", "לצלם את הקופה")).toBe("פתיחת קופה. לצלם את הקופה");
  });

  it("keeps only the title when there is no instruction", () => {
    expect(taskSpeechText("פתיחת קופה", "  ")).toBe("פתיחת קופה");
  });
});
