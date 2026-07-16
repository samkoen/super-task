import { describe, expect, it } from "vitest";
import {
  appendDescriptionBlock,
  computePhotoDisplaySize,
  dataUrlToFile,
  hitTestAnnotation,
  moveAnnotation,
  scaleAnnotations,
} from "./photoAnnotation";

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

  it("scales ellipse axes independently", () => {
    const scaled = scaleAnnotations([{ type: "ellipse", cx: 10, cy: 20, rx: 4, ry: 6 }], 2, 3);
    expect(scaled[0]).toEqual({ type: "ellipse", cx: 20, cy: 60, rx: 8, ry: 18 });
  });
});

describe("hitTestAnnotation", () => {
  it("hits inside ellipse", () => {
    expect(hitTestAnnotation({ type: "ellipse", cx: 50, cy: 50, rx: 20, ry: 10 }, 50, 50)).toBe(true);
  });

  it("misses far from arrow", () => {
    expect(hitTestAnnotation({ type: "arrow", x1: 0, y1: 0, x2: 100, y2: 0 }, 50, 40, 5)).toBe(false);
  });
});

describe("moveAnnotation", () => {
  it("moves ellipse by delta", () => {
    expect(moveAnnotation({ type: "ellipse", cx: 10, cy: 20, rx: 5, ry: 5 }, 3, -2)).toEqual({
      type: "ellipse",
      cx: 13,
      cy: 18,
      rx: 5,
      ry: 5,
    });
  });
});

describe("dataUrlToFile", () => {
  it("converts jpeg data url to file", () => {
    const file = dataUrlToFile("data:image/jpeg;base64,/9j/4AAQ", "test.jpg");
    expect(file.name).toBe("test.jpg");
    expect(file.type).toBe("image/jpeg");
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
