export type AnnotationTool = "circle" | "arrow";

export interface CircleAnnotation {
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
}

export interface ArrowAnnotation {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type PhotoAnnotation = CircleAnnotation | ArrowAnnotation;

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

export function drawAnnotation(ctx: CanvasRenderingContext2D, shape: PhotoAnnotation) {
  ctx.strokeStyle = "#e53935";
  ctx.fillStyle = "#e53935";
  ctx.lineWidth = Math.max(2, Math.min(ctx.canvas.width, ctx.canvas.height) * 0.004);

  if (shape.type === "circle") {
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
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

export function appendDescriptionBlock(existing: string, addition: string): string {
  const extra = addition.trim();
  if (!extra) return existing;
  const base = existing.trim();
  if (!base) return extra;
  return `${base}\n\n${extra}`;
}
