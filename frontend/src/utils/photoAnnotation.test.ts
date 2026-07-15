import { describe, expect, it } from "vitest";
import { appendDescriptionBlock, scaleAnnotations } from "./photoAnnotation";

describe("appendDescriptionBlock", () => {
  it("returns addition when base empty", () => {
    expect(appendDescriptionBlock("", "  hello  ")).toBe("hello");
  });

  it("appends with blank line", () => {
    expect(appendDescriptionBlock("line1", "line2")).toBe("line1\n\nline2");
  });

  it("ignores empty addition", () => {
    expect(appendDescriptionBlock("line1", "   ")).toBe("line1");
  });
});

describe("scaleAnnotations", () => {
  it("scales circle coordinates to full image size", () => {
    const scaled = scaleAnnotations([{ type: "circle", cx: 100, cy: 50, radius: 20 }], 2, 2);
    expect(scaled[0]).toEqual({ type: "circle", cx: 200, cy: 100, radius: 40 });
  });
});
