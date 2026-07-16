export type AnnotationTool = "ellipse" | "arrow" | "select";

export interface CircleAnnotation {
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
}

export interface EllipseAnnotation {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ArrowAnnotation {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type PhotoAnnotation = CircleAnnotation | EllipseAnnotation | ArrowAnnotation;

export const ANNOTATION_STROKE = "#e53935";

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export function strokeWidthForCanvas(width: number, height: number): number {
  return Math.max(2, Math.min(width, height) * 0.004);
}

export function drawAnnotation(ctx: CanvasRenderingContext2D, shape: PhotoAnnotation) {
  ctx.strokeStyle = ANNOTATION_STROKE;
  ctx.fillStyle = ANNOTATION_STROKE;
  ctx.lineWidth = strokeWidthForCanvas(ctx.canvas.width, ctx.canvas.height);

  if (shape.type === "circle") {
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(shape.cx, shape.cy, Math.max(shape.rx, 1), Math.max(shape.ry, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(shape.x1, shape.y1);
  ctx.lineTo(shape.x2, shape.y2);
  ctx.stroke();
  const head = Math.max(10, ctx.lineWidth * 4);
  drawArrowHead(ctx, shape.x1, shape.y1, shape.x2, shape.y2, head);
}

export function hitTestAnnotation(
  shape: PhotoAnnotation,
  x: number,
  y: number,
  tolerance = 10
): boolean {
  if (shape.type === "circle") {
    return Math.hypot(x - shape.cx, y - shape.cy) <= shape.radius + tolerance;
  }
  if (shape.type === "ellipse") {
    const nx = (x - shape.cx) / Math.max(shape.rx + tolerance, 1);
    const ny = (y - shape.cy) / Math.max(shape.ry + tolerance, 1);
    return nx * nx + ny * ny <= 1;
  }
  const { x1, y1, x2, y2 } = shape;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1) <= tolerance;
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= tolerance;
}

export function moveAnnotation(
  shape: PhotoAnnotation,
  dx: number,
  dy: number
): PhotoAnnotation {
  if (shape.type === "circle") {
    return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  }
  if (shape.type === "ellipse") {
    return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  }
  return {
    ...shape,
    x1: shape.x1 + dx,
    y1: shape.y1 + dy,
    x2: shape.x2 + dx,
    y2: shape.y2 + dy,
  };
}

export function scaleAnnotations(
  shapes: PhotoAnnotation[],
  scaleX: number,
  scaleY: number
): PhotoAnnotation[] {
  const radiusScale = (scaleX + scaleY) / 2;
  return shapes.map((shape) => {
    if (shape.type === "circle") {
      return {
        type: "circle",
        cx: shape.cx * scaleX,
        cy: shape.cy * scaleY,
        radius: shape.radius * radiusScale,
      };
    }
    if (shape.type === "ellipse") {
      return {
        type: "ellipse",
        cx: shape.cx * scaleX,
        cy: shape.cy * scaleY,
        rx: shape.rx * scaleX,
        ry: shape.ry * scaleY,
      };
    }
    return {
      type: "arrow",
      x1: shape.x1 * scaleX,
      y1: shape.y1 * scaleY,
      x2: shape.x2 * scaleX,
      y2: shape.y2 * scaleY,
    };
  });
}

export function renderAnnotatedImage(
  image: HTMLImageElement,
  shapes: PhotoAnnotation[],
  displaySize?: { width: number; height: number }
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("canvas unsupported"));
  }
  ctx.drawImage(image, 0, 0);
  const exportShapes =
    displaySize && displaySize.width > 0 && displaySize.height > 0
      ? scaleAnnotations(
          shapes,
          image.naturalWidth / displaySize.width,
          image.naturalHeight / displaySize.height
        )
      : shapes;
  for (const shape of exportShapes) {
    drawAnnotation(ctx, shape);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export function computePhotoDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  bounds: { maxWidth: number; maxHeight: number }
): { width: number; height: number; multiplier: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0, multiplier: 1 };
  }
  const scale = Math.min(1, bounds.maxWidth / naturalWidth, bounds.maxHeight / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  return { width, height, multiplier: naturalWidth / width };
}

export function appendDescriptionBlock(existing: string, addition: string): string {
  const extra = addition.trim();
  if (!extra) return existing;
  const base = existing.trim();
  if (!base) return extra;
  return `${base}\n\n${extra}`;
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

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}
