import { Ellipse, Group, Line, Triangle, type FabricObject } from "fabric";

export const ANNOTATION_STROKE = "#e53935";
export const ANNOTATION_STROKE_WIDTH = 3;

const annotationBase = {
  stroke: ANNOTATION_STROKE,
  strokeWidth: ANNOTATION_STROKE_WIDTH,
  fill: "rgba(0,0,0,0)",
  strokeUniform: true,
  objectCaching: false,
  selectable: true,
  evented: true,
  perPixelTargetFind: true,
  hasControls: true,
  hasBorders: true,
  padding: 6,
};

export function createAnnotationEllipse(left: number, top: number, rx: number, ry: number): Ellipse {
  return new Ellipse({
    ...annotationBase,
    left,
    top,
    rx: Math.max(rx, 1),
    ry: Math.max(ry, 1),
    originX: "center",
    originY: "center",
  });
}

export function createAnnotationArrow(x1: number, y1: number, x2: number, y2: number): Group {
  const line = new Line([x1, y1, x2, y2], {
    stroke: ANNOTATION_STROKE,
    strokeWidth: ANNOTATION_STROKE_WIDTH,
    selectable: false,
    evented: false,
  });
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const head = new Triangle({
    left: x2,
    top: y2,
    width: 14,
    height: 18,
    fill: ANNOTATION_STROKE,
    stroke: ANNOTATION_STROKE,
    strokeWidth: 1,
    originX: "center",
    originY: "center",
    angle: angleDeg + 90,
    selectable: false,
    evented: false,
  });
  return new Group([line, head], {
    ...annotationBase,
    lockScalingFlip: true,
    subTargetCheck: false,
  });
}

export function isAnnotationObject(obj: FabricObject | undefined | null): boolean {
  if (!obj) return false;
  if (obj instanceof Ellipse) return true;
  if (obj instanceof Group) return true;
  return false;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
