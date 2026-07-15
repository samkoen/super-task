import { describe, expect, it } from "vitest";
import { createAnnotationEllipse, dataUrlToFile } from "./fabricAnnotation";

describe("createAnnotationEllipse", () => {
  it("creates an ellipse with stroke", () => {
    const ellipse = createAnnotationEllipse(10, 20, 30, 15);
    expect(ellipse.rx).toBe(30);
    expect(ellipse.ry).toBe(15);
    expect(ellipse.stroke).toBe("#e53935");
    expect(ellipse.perPixelTargetFind).toBe(true);
  });
});

describe("dataUrlToFile", () => {
  it("converts jpeg data url to file", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQ";
    const file = dataUrlToFile(dataUrl, "test.jpg");
    expect(file.name).toBe("test.jpg");
    expect(file.type).toBe("image/jpeg");
  });
});
