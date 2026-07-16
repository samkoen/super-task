import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NearMeIcon from "@mui/icons-material/NearMe";
import AdjustIcon from "@mui/icons-material/Adjust";
import PanToolIcon from "@mui/icons-material/PanTool";
import {
  blobToFile,
  drawAnnotation,
  hitTestAnnotation,
  loadImageElement,
  moveAnnotation,
  renderAnnotatedImage,
  computePhotoDisplaySize,
  type AnnotationTool,
  type PhotoAnnotation,
} from "../../utils/photoAnnotation";
import { he } from "../../i18n/he";

export type { AnnotationTool };

export interface PhotoAnnotationCanvasHandle {
  exportFile: () => Promise<File>;
}

interface PhotoAnnotationCanvasProps {
  imageBlob: Blob;
}

type DrawState =
  | { kind: "ellipse"; startX: number; startY: number }
  | { kind: "arrow"; startX: number; startY: number }
  | { kind: "move"; index: number; lastX: number; lastY: number };

function readDisplayBounds(container: HTMLElement | null): { maxWidth: number; maxHeight: number } {
  const width = container?.clientWidth ?? 0;
  const maxWidth = Math.max(280, width > 0 ? width : Math.min(window.innerWidth - 48, 640));
  const maxHeight = Math.max(240, Math.min(window.innerHeight * 0.5, 520));
  return { maxWidth, maxHeight };
}

function pointerToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

const PhotoAnnotationCanvas = forwardRef<PhotoAnnotationCanvasHandle, PhotoAnnotationCanvasProps>(
  function PhotoAnnotationCanvas({ imageBlob }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const shapesRef = useRef<PhotoAnnotation[]>([]);
    const selectedRef = useRef<number | null>(null);
    const drawStateRef = useRef<DrawState | null>(null);
    const toolRef = useRef<AnnotationTool>("ellipse");
    const draftRef = useRef<PhotoAnnotation | null>(null);
    const [tool, setTool] = useState<AnnotationTool>("ellipse");
    const [ready, setReady] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [displayBounds, setDisplayBounds] = useState(() => readDisplayBounds(null));

    useEffect(() => {
      toolRef.current = tool;
    }, [tool]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const updateBounds = () => setDisplayBounds(readDisplayBounds(container));
      updateBounds();
      const observer = new ResizeObserver(updateBounds);
      observer.observe(container);
      window.addEventListener("resize", updateBounds);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateBounds);
      };
    }, []);

    const paint = () => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !image || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (let i = 0; i < shapesRef.current.length; i += 1) {
        drawAnnotation(ctx, shapesRef.current[i]);
        if (selectedRef.current === i) {
          ctx.save();
          ctx.strokeStyle = "#1976d2";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          const shape = shapesRef.current[i];
          if (shape.type === "ellipse") {
            ctx.strokeRect(shape.cx - shape.rx, shape.cy - shape.ry, shape.rx * 2, shape.ry * 2);
          } else if (shape.type === "circle") {
            ctx.strokeRect(
              shape.cx - shape.radius,
              shape.cy - shape.radius,
              shape.radius * 2,
              shape.radius * 2
            );
          } else {
            const minX = Math.min(shape.x1, shape.x2);
            const minY = Math.min(shape.y1, shape.y2);
            ctx.strokeRect(
              minX - 4,
              minY - 4,
              Math.abs(shape.x2 - shape.x1) + 8,
              Math.abs(shape.y2 - shape.y1) + 8
            );
          }
          ctx.restore();
        }
      }
      if (draftRef.current) {
        drawAnnotation(ctx, draftRef.current);
      }
    };

    useEffect(() => {
      let cancelled = false;
      const url = URL.createObjectURL(imageBlob);
      setReady(false);
      shapesRef.current = [];
      selectedRef.current = null;
      draftRef.current = null;
      setHasSelection(false);

      void loadImageElement(url).then((image) => {
        if (cancelled || !canvasRef.current) return;
        const { width, height } = computePhotoDisplaySize(
          image.naturalWidth,
          image.naturalHeight,
          displayBounds
        );
        if (width <= 0 || height <= 0) return;
        imageRef.current = image;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        paint();
        setReady(true);
      });

      return () => {
        cancelled = true;
        URL.revokeObjectURL(url);
        imageRef.current = null;
        drawStateRef.current = null;
        draftRef.current = null;
      };
      // paint reads refs; re-run when image/bounds change
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageBlob, displayBounds]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        if (selectedRef.current === null) return;
        event.preventDefault();
        shapesRef.current = shapesRef.current.filter((_, i) => i !== selectedRef.current);
        selectedRef.current = null;
        setHasSelection(false);
        paint();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const deleteSelected = () => {
      if (selectedRef.current === null) return;
      shapesRef.current = shapesRef.current.filter((_, i) => i !== selectedRef.current);
      selectedRef.current = null;
      setHasSelection(false);
      paint();
    };

    const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !ready) return;
      canvas.setPointerCapture(event.pointerId);
      const { x, y } = pointerToCanvas(canvas, event.clientX, event.clientY);
      const currentTool = toolRef.current;

      if (currentTool === "select") {
        let hit = -1;
        for (let i = shapesRef.current.length - 1; i >= 0; i -= 1) {
          if (hitTestAnnotation(shapesRef.current[i], x, y)) {
            hit = i;
            break;
          }
        }
        selectedRef.current = hit >= 0 ? hit : null;
        setHasSelection(hit >= 0);
        if (hit >= 0) {
          drawStateRef.current = { kind: "move", index: hit, lastX: x, lastY: y };
        } else {
          drawStateRef.current = null;
        }
        paint();
        return;
      }

      selectedRef.current = null;
      setHasSelection(false);
      if (currentTool === "ellipse") {
        drawStateRef.current = { kind: "ellipse", startX: x, startY: y };
        draftRef.current = { type: "ellipse", cx: x, cy: y, rx: 1, ry: 1 };
      } else {
        drawStateRef.current = { kind: "arrow", startX: x, startY: y };
        draftRef.current = { type: "arrow", x1: x, y1: y, x2: x, y2: y };
      }
      paint();
    };

    const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const state = drawStateRef.current;
      if (!canvas || !state) return;
      const { x, y } = pointerToCanvas(canvas, event.clientX, event.clientY);

      if (state.kind === "move") {
        const dx = x - state.lastX;
        const dy = y - state.lastY;
        shapesRef.current[state.index] = moveAnnotation(shapesRef.current[state.index], dx, dy);
        drawStateRef.current = { ...state, lastX: x, lastY: y };
        paint();
        return;
      }

      if (state.kind === "ellipse") {
        draftRef.current = {
          type: "ellipse",
          cx: (state.startX + x) / 2,
          cy: (state.startY + y) / 2,
          rx: Math.max(Math.abs(x - state.startX) / 2, 1),
          ry: Math.max(Math.abs(y - state.startY) / 2, 1),
        };
      } else {
        draftRef.current = {
          type: "arrow",
          x1: state.startX,
          y1: state.startY,
          x2: x,
          y2: y,
        };
      }
      paint();
    };

    const onPointerUp = () => {
      const state = drawStateRef.current;
      const draft = draftRef.current;
      drawStateRef.current = null;
      draftRef.current = null;
      if (!state || state.kind === "move" || !draft) {
        paint();
        return;
      }
      if (draft.type === "ellipse") {
        if (draft.rx >= 8 || draft.ry >= 8) {
          shapesRef.current = [...shapesRef.current, draft];
        }
      } else if (draft.type === "arrow") {
        if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) >= 12) {
          shapesRef.current = [...shapesRef.current, draft];
        }
      }
      paint();
    };

    useImperativeHandle(ref, () => ({
      exportFile: async () => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (!image || !canvas) {
          throw new Error("canvas not ready");
        }
        const blob = await renderAnnotatedImage(image, shapesRef.current, {
          width: canvas.width,
          height: canvas.height,
        });
        return blobToFile(blob, `task-photo-${Date.now()}.jpg`);
      },
    }));

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tool}
          onChange={(_, value: AnnotationTool | null) => value && setTool(value)}
        >
          <Tooltip title={he.photoAnnotateEllipse}>
            <ToggleButton value="ellipse" aria-label={he.photoAnnotateEllipse}>
              <AdjustIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title={he.photoAnnotateArrow}>
            <ToggleButton value="arrow" aria-label={he.photoAnnotateArrow}>
              <NearMeIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <ToggleButton value="select">
            <PanToolIcon fontSize="small" sx={{ mr: 0.5 }} />
            {he.photoAnnotateSelect}
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {he.mediaCapturePhotoAnnotateHint}
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            lineHeight: 0,
            bgcolor: "grey.100",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              maxWidth: "100%",
              cursor: tool === "select" ? "default" : "crosshair",
              touchAction: "none",
            }}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={he.photoAnnotateDelete}>
            <span>
              <IconButton size="small" onClick={deleteSelected} disabled={!hasSelection}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            {he.photoAnnotateEditHint}
          </Typography>
        </Box>
      </Box>
    );
  }
);

export default PhotoAnnotationCanvas;
