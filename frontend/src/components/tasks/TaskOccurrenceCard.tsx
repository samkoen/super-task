import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import EditIcon from "@mui/icons-material/Edit";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RateReviewIcon from "@mui/icons-material/RateReview";
import CompletionMediaPreview from "./CompletionMediaPreview";
import { cardColor } from "../../constants/cardColors";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";
import type { TaskOccurrence, TaskStatus } from "../../services/taskService";

const statusColor: Record<TaskStatus, "default" | "warning" | "success" | "error" | "info"> = {
  pending: "warning",
  in_progress: "warning",
  pending_review: "info",
  completed: "success",
  overdue: "error",
  cancelled: "default",
};

export interface TaskOccurrenceCardProps {
  task: TaskOccurrence;
  index: number;
  isBranchManager?: boolean;
  onEdit?: (task: TaskOccurrence) => void;
  onCancel?: (task: TaskOccurrence) => void;
  onReview?: (task: TaskOccurrence) => void;
  onAddToGallery?: (task: TaskOccurrence) => void;
}

export default function TaskOccurrenceCard({
  task,
  index,
  onEdit,
  onCancel,
  onReview,
  onAddToGallery,
}: TaskOccurrenceCardProps) {
  const { bg, accent } = cardColor(index);
  const photoBg = taskCardBackgroundUrl(task.reference_photo_url);
  const urgent = task.status === "overdue";
  const awaitingReview = task.status === "pending_review";
  const assigneeLabel = task.assignee_name ?? he.allDepartment;
  const canCancel = !["completed", "cancelled"].includes(task.status);
  const canEdit = !["completed", "cancelled", "pending_review"].includes(task.status) && Boolean(onEdit);
  const canReview = awaitingReview && Boolean(onReview);

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        bgcolor: bg,
        borderRadius: 3,
        border: "1px solid",
        borderColor: urgent ? "error.light" : "divider",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        transition: "box-shadow 0.2s, transform 0.15s, border-color 0.15s",
        position: "relative",
        overflow: "hidden",
        ...(photoBg
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.72) 100%), url(${photoBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#fff",
            }
          : {}),
        "&::before": {
          content: '""',
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: urgent ? "error.main" : accent,
          zIndex: 1,
        },
        "&:hover": { boxShadow: 4, transform: "translateY(-3px)", borderColor: urgent ? "error.main" : accent },
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          minHeight: 168,
          position: "relative",
          zIndex: 1,
          ...(photoBg
            ? {
                "& .MuiTypography-root": { color: "inherit" },
                "& .MuiTypography-caption, & .MuiTypography-body2": { color: "rgba(255,255,255,0.85)" },
                "& .MuiChip-root": {
                  bgcolor: "rgba(255,255,255,0.16)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.35)",
                },
                "& .MuiIconButton-root": { color: "#fff" },
              }
            : {}),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 46,
              height: 46,
              bgcolor: accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.05rem",
              flexShrink: 0,
              boxShadow: `0 4px 12px ${accent}40`,
            }}
          >
            {task.title.trim()[0]?.toUpperCase() ?? "?"}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35 }}>
              {task.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {he.taskKindLabels[task.task_kind]}
              {task.branch_name ? ` · ${task.branch_name}` : ""}
              {task.department_name ? ` · ${task.department_name}` : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
            {onAddToGallery && task.can_add_to_gallery && (
              <Tooltip title={he.taskGalleryAddFromTask}>
                <IconButton size="small" color="primary" onClick={() => onAddToGallery(task)}>
                  <CollectionsBookmarkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && onEdit && (
              <Tooltip title={he.editTask}>
                <IconButton size="small" color="primary" onClick={() => onEdit(task)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canCancel && onCancel && (
              <Tooltip title={he.cancel}>
                <IconButton size="small" color="warning" onClick={() => onCancel(task)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {he.status}:
          </Typography>
          <Chip
            label={he.taskStatusLabels[task.status]}
            color={statusColor[task.status]}
            size="small"
            sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600 }}
          />
          {urgent && (
            <Chip label={he.employeeUrgentTasks} color="error" size="small" sx={{ height: 22, fontSize: "0.75rem" }} />
          )}
          {task.photo_required && (
            <Chip label={he.photoRequired} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.75rem" }} />
          )}
        </Box>

        {task.description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </Typography>
        ) : null}

        {awaitingReview && task.completion && (
          <CompletionMediaPreview
            photo_path={task.completion.photo_path}
            video_path={task.completion.video_path}
            audio_path={task.completion.audio_path}
          />
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", mt: "auto" }}>
          <PersonOutlineIcon sx={{ fontSize: 18, opacity: 0.7 }} />
          <Typography variant="caption">{assigneeLabel}</Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" dir="ltr" display="block">
          {he.dueAt}: {formatDueAt(task.due_at)}
        </Typography>
      </Box>

      {(canCancel || canReview) && (
        <CardActions
          sx={{
            px: 2,
            pb: 2,
            pt: 0,
            flexDirection: "column",
            gap: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {canReview && onReview && (
            <Button
              fullWidth
              variant="contained"
              color="info"
              size="small"
              startIcon={<RateReviewIcon />}
              onClick={() => onReview(task)}
            >
              {he.taskReviewAction}
            </Button>
          )}
          {canCancel && onCancel && (
            <Button fullWidth variant="outlined" color="warning" size="small" startIcon={<CancelIcon />} onClick={() => onCancel(task)}>
              {he.cancel}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}
