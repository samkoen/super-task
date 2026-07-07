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
import EditIcon from "@mui/icons-material/Edit";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { cardColor } from "../../constants/cardColors";
import { he } from "../../i18n/he";
import type { TaskOccurrence, TaskStatus } from "../../services/taskService";

const statusColor: Record<TaskStatus, "default" | "warning" | "success" | "error"> = {
  pending: "warning",
  in_progress: "warning",
  completed: "success",
  overdue: "error",
  cancelled: "default",
};

export interface TaskOccurrenceCardProps {
  task: TaskOccurrence;
  index: number;
  isBranchManager?: boolean;
  onDelegate?: (task: TaskOccurrence) => void;
  onEdit?: (task: TaskOccurrence) => void;
  onCancel?: (task: TaskOccurrence) => void;
}

export default function TaskOccurrenceCard({
  task,
  index,
  isBranchManager,
  onDelegate,
  onEdit,
  onCancel,
}: TaskOccurrenceCardProps) {
  const { bg, accent } = cardColor(index);
  const urgent = task.status === "overdue";
  const assigneeLabel = task.assignee_name
    ?? (task.pending_delegation ? he.pendingDelegation : he.allDepartment);
  const canCancel = !["completed", "cancelled"].includes(task.status) && !task.pending_delegation;
  const canDelegate = Boolean(task.pending_delegation && isBranchManager);
  const canEdit = !["completed", "cancelled"].includes(task.status) && Boolean(onEdit);

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        bgcolor: bg,
        borderRadius: 2,
        border: "1px solid",
        borderColor: urgent ? "error.light" : "rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s, transform 0.15s",
        "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 168 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.1rem",
              flexShrink: 0,
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
            {canEdit && onEdit && (
              <Tooltip title={he.editTask}>
                <IconButton size="small" color="primary" onClick={() => onEdit(task)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelegate && onDelegate && (
              <Tooltip title={he.delegateTask}>
                <IconButton size="small" color="primary" onClick={() => onDelegate(task)}>
                  <SwapHorizIcon fontSize="small" />
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

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", mt: "auto" }}>
          <PersonOutlineIcon sx={{ fontSize: 18, opacity: 0.7 }} />
          <Typography variant="caption">{assigneeLabel}</Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" dir="ltr" display="block">
          {he.dueAt}: {new Date(task.due_at).toLocaleString("he-IL")}
        </Typography>
      </Box>

      {(canDelegate || canCancel) && (
        <CardActions sx={{ px: 2, pb: 2, pt: 0, flexDirection: "column", gap: 1 }}>
          {canDelegate && onDelegate && (
            <Button fullWidth variant="contained" size="small" onClick={() => onDelegate(task)}>
              {he.delegateTask}
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
