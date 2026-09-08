import { describe, expect, it, vi } from "vitest";
import {
  ANNOTATION_STROKE_EMPLOYEE,
  ANNOTATION_STROKE_MANAGER,
  annotationStrokeForRole,
  appendDescriptionBlock,
  drawAnnotation,
  computePhotoDisplaySize,
  dataUrlToBlob,
  dataUrlToFile,
  hitTestAnnotation,
  loadImageElement,
  moveAnnotation,
  renderAnnotatedImage,
  scaleAnnotations,
} from "./photoAnnotation";
import { PHOTO_UPLOAD_MAX_EDGE } from "./mediaCapture";

describe("annotationStrokeForRole", () => {
  it("uses red for menahel and blue for oved", () => {
    expect(annotationStrokeForRole("branch_manager")).toBe(ANNOTATION_STROKE_MANAGER);
    expect(annotationStrokeForRole("network_manager")).toBe(ANNOTATION_STROKE_MANAGER);
    expect(annotationStrokeForRole("admin")).toBe(ANNOTATION_STROKE_MANAGER);
    expect(annotationStrokeForRole("employee")).toBe(ANNOTATION_STROKE_EMPLOYEE);
  });

  it("uses blue when a menahel previews the oved surface", () => {
    expect(annotationStrokeForRole("branch_manager", true)).toBe(ANNOTATION_STROKE_EMPLOYEE);
  });

  it("paints a circle with the given stroke", () => {
    const colors: string[] = [];
    const ctx = {
      canvas: { width: 100, height: 100 },
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      set strokeStyle(value: string) {
        colors.push(value);
      },
      set fillStyle(value: string) {
        colors.push(value);
      },
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
    drawAnnotation(ctx, { type: "circle", cx: 10, cy: 10, radius: 4 }, ANNOTATION_STROKE_EMPLOYEE);
    expect(colors).toContain(ANNOTATION_STROKE_EMPLOYEE);
  });
});

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

describe("dataUrlToBlob", () => {
  it("keeps the jpeg mime without fetch", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,/9j/4AAQ");
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("loadImageElement", () => {
  it("does not set cors on blob urls", async () => {
    const seen: string[] = [];
    class FakeImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        seen.push(this.crossOrigin);
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    await loadImageElement("blob:http://localhost/shot");
    expect(seen[0]).toBe("");
    vi.unstubAllGlobals();
  });
});

describe("renderAnnotatedImage", () => {
  it("exports jpeg at the upload max edge, not the full camera size", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      canvas: { width: 0, height: 0 },
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      cb,
    ) {
      expect(Math.max(this.width, this.height)).toBeLessThanOrEqual(PHOTO_UPLOAD_MAX_EDGE);
      cb(new Blob(["x"], { type: "image/jpeg" }));
    });
    const image = { naturalWidth: 4000, naturalHeight: 3000 } as HTMLImageElement;
    const blob = await renderAnnotatedImage(image, [], { width: 400, height: 300 });
    expect(blob.type).toBe("image/jpeg");
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
