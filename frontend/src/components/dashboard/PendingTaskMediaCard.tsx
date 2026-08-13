import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Typography,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import type { TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";

function statusAccent(status: string): string {
  if (status === "overdue") return "#d32f2f";
  if (status === "in_progress") return "#ed6c02";
  return "#757575";
}

function usePhotoReady(photoBg: string | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!photoBg) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = photoBg;
    return () => {
      cancelled = true;
    };
  }, [photoBg]);
  return ready;
}

function PhotoHalf({
  photoBg,
  border,
  title,
  onZoom,
}: {
  photoBg: string | null;
  border: string;
  title: string;
  onZoom: () => void;
}) {
  const ready = usePhotoReady(photoBg);
  if (!(photoBg && ready)) {
    return (
      <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: border, opacity: 0.35 }}>
          {title.trim()[0]?.toUpperCase() ?? "?"}
        </Typography>
      </Box>
    );
  }
  return (
    <Box
      component="button"
      type="button"
      aria-label={he.taskPhotoEnlarge}
      onClick={onZoom}
      sx={{
        position: "absolute",
        inset: 0,
        border: 0,
        p: 0,
        m: 0,
        cursor: "zoom-in",
        display: "block",
        width: "100%",
        height: "100%",
        bgcolor: "transparent",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${photoBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(18px)",
          transform: "scale(1.12)",
          opacity: 0.55,
        }}
      />
      <Box
        component="img"
        src={photoBg}
        alt=""
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
      <ZoomOutMapIcon
        sx={{
          position: "absolute",
          zIndex: 2,
          insetInlineEnd: 4,
          bottom: 4,
          color: "#fff",
          opacity: 0.85,
          fontSize: 14,
        }}
      />
    </Box>
  );
}

function PhotoLightbox({
  open,
  photoBg,
  onClose,
}: {
  open: boolean;
  photoBg: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open && Boolean(photoBg)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{ sx: { bgcolor: "#0f172a", backgroundImage: "none", m: 1 } }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
        <IconButton aria-label={he.close} onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 0, pb: 2, display: "flex", justifyContent: "center" }}>
        {photoBg && (
          <Box
            component="img"
            src={photoBg}
            alt={he.taskReferencePhoto}
            sx={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 1 }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PendingTaskMediaCardProps {
  task: TimelineTask;
  onOpen?: (task: TimelineTask) => void;
}

/** Carte carrousel : moitié photo (zoom) + infos ; clic infos → ouvrir/éditer. */
export default function PendingTaskMediaCard({ task, onOpen }: PendingTaskMediaCardProps) {
  const border = statusAccent(task.status);
  const photoBg = taskCardBackgroundUrl(task.reference_photo_url);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          minWidth: 120,
          maxWidth: 130,
          width: 120,
          flex: "0 0 auto",
          p: 0,
          overflow: "hidden",
          scrollSnapAlign: "start",
          borderColor: alpha(border, 0.45),
          borderInlineStartWidth: 3,
          borderInlineStartColor: border,
        }}
      >
        <Box
          sx={{
            height: 60,
            bgcolor: alpha(border, 0.06),
            position: "relative",
            overflow: "hidden",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <PhotoHalf
            photoBg={photoBg}
            border={border}
            title={task.title}
            onZoom={() => setLightboxOpen(true)}
          />
        </Box>
        <Box
          component={onOpen ? "button" : "div"}
          type={onOpen ? "button" : undefined}
          onClick={onOpen ? () => onOpen(task) : undefined}
          aria-label={onOpen ? `${he.openTask}: ${task.title}` : undefined}
          sx={{
            p: 0.75,
            width: "100%",
            textAlign: "start",
            border: 0,
            bgcolor: "transparent",
            cursor: onOpen ? "pointer" : "default",
            font: "inherit",
            color: "inherit",
            display: "block",
            "&:hover": onOpen ? { bgcolor: "action.hover" } : undefined,
          }}
        >
          <Typography variant="caption" fontWeight={800} display="block" noWrap title={task.title}>
            {task.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {[task.assignee_name, task.department_name].filter(Boolean).join(" · ") || "—"}
          </Typography>
          <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
            <Chip
              size="small"
              label={`${he.dashboardDueAt} ${formatDueAt(task.due_at)}`}
              variant="outlined"
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
            {task.status === "overdue" && (
              <Chip
                size="small"
                color="error"
                label={he.timelineSegmentOverdue}
                sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
              />
            )}
            {task.status === "in_progress" && (
              <Chip
                size="small"
                color="warning"
                label={he.timelineSegmentInProgress}
                sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
              />
            )}
          </Box>
        </Box>
      </Paper>
      <PhotoLightbox
        open={lightboxOpen}
        photoBg={photoBg}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
