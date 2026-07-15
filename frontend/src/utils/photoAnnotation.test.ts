import { describe, expect, it } from "vitest";
import { appendDescriptionBlock, computePhotoDisplaySize, scaleAnnotations } from "./photoAnnotation";

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

describe("computePhotoDisplaySize", () => {
  it("fits portrait photos within width and height bounds", () => {
    const size = computePhotoDisplaySize(3000, 4000, { maxWidth: 300, maxHeight: 400 });
    expect(size.width).toBe(300);
    expect(size.height).toBe(400);
    expect(size.multiplier).toBe(10);
  });

  it("keeps landscape photos fully visible", () => {
    const size = computePhotoDisplaySize(4000, 3000, { maxWidth: 320, maxHeight: 240 });
    expect(size.width).toBe(320);
    expect(size.height).toBe(240);
  });
});
