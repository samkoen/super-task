import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NearMeIcon from "@mui/icons-material/NearMe";
import AdjustIcon from "@mui/icons-material/Adjust";
import PanToolIcon from "@mui/icons-material/PanTool";
import { Canvas, FabricImage, type TPointerEventInfo } from "fabric";
import {
  createAnnotationArrow,
  createAnnotationEllipse,
  dataUrlToFile,
  isAnnotationObject,
} from "../../utils/fabricAnnotation";
import { computePhotoDisplaySize, loadImageElement } from "../../utils/photoAnnotation";
import { he } from "../../i18n/he";

export type AnnotationTool = "select" | "ellipse" | "arrow";

export interface PhotoAnnotationCanvasHandle {
  exportFile: () => Promise<File>;
}

interface PhotoAnnotationCanvasProps {
  imageBlob: Blob;
}

type DrawState = {
  kind: "ellipse" | "arrow";
  startX: number;
  startY: number;
  draft?: ReturnType<typeof createAnnotationEllipse> | ReturnType<typeof createAnnotationArrow>;
};

function readDisplayBounds(container: HTMLElement | null): { maxWidth: number; maxHeight: number } {
  const width = container?.clientWidth ?? 0;
  const maxWidth = Math.max(280, width > 0 ? width : Math.min(window.innerWidth - 48, 640));
  const maxHeight = Math.max(240, Math.min(window.innerHeight * 0.5, 520));
  return { maxWidth, maxHeight };
}

const PhotoAnnotationCanvas = forwardRef<PhotoAnnotationCanvasHandle, PhotoAnnotationCanvasProps>(
  function PhotoAnnotationCanvas({ imageBlob }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const exportMultiplierRef = useRef(1);
    const drawStateRef = useRef<DrawState | null>(null);
    const toolRef = useRef<AnnotationTool>("ellipse");
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

    useEffect(() => {
      let cancelled = false;
      const url = URL.createObjectURL(imageBlob);
      setReady(false);

      void loadImageElement(url).then(async (image) => {
        if (cancelled || !canvasElRef.current || !containerRef.current) return;

        const { width, height, multiplier } = computePhotoDisplaySize(
          image.naturalWidth,
          image.naturalHeight,
          displayBounds
        );
        if (width <= 0 || height <= 0) return;

        exportMultiplierRef.current = multiplier;

        fabricRef.current?.dispose();
        const canvas = new Canvas(canvasElRef.current, {
          width,
          height,
          selection: true,
          preserveObjectStacking: true,
          targetFindTolerance: 8,
          perPixelTargetFind: true,
        });
        fabricRef.current = canvas;

        const bg = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
        if (cancelled) {
          canvas.dispose();
          return;
        }
        const sourceWidth = bg.width || image.naturalWidth;
        const sourceHeight = bg.height || image.naturalHeight;
        bg.set({
          left: 0,
          top: 0,
          scaleX: width / sourceWidth,
          scaleY: height / sourceHeight,
          selectable: false,
          evented: false,
        });
        canvas.add(bg);
        canvas.sendObjectToBack(bg);

        const syncSelection = () => {
          const active = canvas.getActiveObject();
          setHasSelection(isAnnotationObject(active));
        };

        canvas.on("selection:created", syncSelection);
        canvas.on("selection:updated", syncSelection);
        canvas.on("selection:cleared", () => setHasSelection(false));

        canvas.on("mouse:down", (opt: TPointerEventInfo) => {
          const currentTool = toolRef.current;
          if (currentTool === "select" || !opt.scenePoint) return;
          const target = canvas.findTarget(opt.e);
          if (target && isAnnotationObject(target)) return;
          const { x, y } = opt.scenePoint;
          if (currentTool === "ellipse") {
            const draft = createAnnotationEllipse(x, y, 1, 1);
            canvas.add(draft);
            drawStateRef.current = { kind: "ellipse", startX: x, startY: y, draft };
          } else {
            const draft = createAnnotationArrow(x, y, x, y);
            canvas.add(draft);
            drawStateRef.current = { kind: "arrow", startX: x, startY: y, draft };
          }
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        });

        canvas.on("mouse:move", (opt: TPointerEventInfo) => {
          const state = drawStateRef.current;
          if (!state?.draft || !opt.scenePoint) return;
          const { x, y } = opt.scenePoint;
          if (state.kind === "ellipse") {
            const rx = Math.abs(x - state.startX) / 2;
            const ry = Math.abs(y - state.startY) / 2;
            (state.draft as ReturnType<typeof createAnnotationEllipse>).set({
              left: (state.startX + x) / 2,
              top: (state.startY + y) / 2,
              rx: Math.max(rx, 1),
              ry: Math.max(ry, 1),
            });
          } else {
            canvas.remove(state.draft);
            const arrow = createAnnotationArrow(state.startX, state.startY, x, y);
            state.draft = arrow;
            canvas.add(arrow);
          }
          canvas.requestRenderAll();
        });

        canvas.on("mouse:up", () => {
          const state = drawStateRef.current;
          if (!state?.draft) return;
          if (state.kind === "ellipse") {
            const ellipse = state.draft as ReturnType<typeof createAnnotationEllipse>;
            if ((ellipse.rx ?? 0) < 8 && (ellipse.ry ?? 0) < 8) {
              canvas.remove(ellipse);
            }
          } else {
            const group = state.draft as ReturnType<typeof createAnnotationArrow>;
            const line = group.getObjects()[0] as { x1?: number; y1?: number; x2?: number; y2?: number };
            const dist = Math.hypot((line.x2 ?? 0) - (line.x1 ?? 0), (line.y2 ?? 0) - (line.y1 ?? 0));
            if (dist < 12) {
              canvas.remove(group);
            }
          }
          drawStateRef.current = null;
          canvas.requestRenderAll();
        });

        setReady(true);
      });

      return () => {
        cancelled = true;
        URL.revokeObjectURL(url);
        fabricRef.current?.dispose();
        fabricRef.current = null;
        drawStateRef.current = null;
      };
    }, [imageBlob, displayBounds]);

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !ready) return;
      canvas.selection = tool === "select";
      canvas.defaultCursor = tool === "select" ? "default" : "crosshair";
      canvas.hoverCursor = tool === "select" ? "move" : "crosshair";
      canvas.getObjects().forEach((obj) => {
        if (isAnnotationObject(obj)) {
          obj.selectable = tool === "select";
          obj.evented = tool === "select";
        }
      });
      if (tool !== "select") {
        canvas.discardActiveObject();
        setHasSelection(false);
      }
      canvas.requestRenderAll();
    }, [tool, ready]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!isAnnotationObject(active)) return;
        event.preventDefault();
        canvas.remove(active!);
        canvas.discardActiveObject();
        setHasSelection(false);
        canvas.requestRenderAll();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const deleteSelected = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!isAnnotationObject(active)) return;
      canvas.remove(active!);
      canvas.discardActiveObject();
      setHasSelection(false);
      canvas.requestRenderAll();
    };

    useImperativeHandle(ref, () => ({
      exportFile: async () => {
        const canvas = fabricRef.current;
        if (!canvas) {
          throw new Error("canvas not ready");
        }
        const dataUrl = canvas.toDataURL({
          format: "jpeg",
          quality: 0.92,
          multiplier: exportMultiplierRef.current,
        });
        return dataUrlToFile(dataUrl, `task-photo-${Date.now()}.jpg`);
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
            "& .canvas-container": {
              maxWidth: "100%",
            },
          }}
        >
          <canvas ref={canvasElRef} />
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
