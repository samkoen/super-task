import { useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ApiError } from "../../services/api";
import type { TeamMember, TimelineTask } from "../../services/dashboardService";
import { taskService } from "../../services/taskService";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { isManagerNextTask } from "../../utils/employeeTaskFocus";
import {
  computeStaffProgress,
  formatPresenceLabel,
  groupMemberTasks,
  memberTasks,
} from "../../utils/staffProgress";
import StaffProgressBar from "./StaffProgressBar";

interface StaffProgressCardProps {
  member: TeamMember;
  onChanged?: () => void;
}

function jobLabel(jobFunction: string | null): string | null {
  if (!jobFunction) return null;
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[jobFunction] ?? jobFunction;
}

function canMarkNext(task: TimelineTask): boolean {
  return !["completed", "cancelled", "pending_review"].includes(task.status);
}

function TaskGroup({
  title,
  tasks,
  busyId,
  onToggleNext,
}: {
  title: string;
  tasks: TimelineTask[];
  busyId: string | null;
  onToggleNext: (task: TimelineTask, enabled: boolean) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <Box mb={1.25}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {title} ({tasks.length})
      </Typography>
      <List dense disablePadding>
        {tasks.map((task) => {
          const isNext = isManagerNextTask(task);
          return (
            <ListItem
              key={task.id}
              disableGutters
              sx={{ py: 0.25, alignItems: "flex-start", gap: 0.5 }}
              secondaryAction={
                canMarkNext(task) ? (
                  <FormControlLabel
                    sx={{ m: 0, mr: -1 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={isNext}
                        disabled={busyId === task.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleNext(task, e.target.checked);
                        }}
                      />
                    }
                    label={
                      <Typography variant="caption" color="text.secondary">
                        {he.managerNextTask}
                      </Typography>
                    }
                  />
                ) : undefined
              }
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600} component="span">
                      {task.title}
                    </Typography>
                    {isNext && (
                      <Chip size="small" color="primary" label={he.managerNextTask} sx={{ height: 20 }} />
                    )}
                  </Box>
                }
                secondary={[task.department_name, `${he.dashboardDueAt} ${formatDueAt(task.due_at)}`]
                  .filter(Boolean)
                  .join(" · ")}
                secondaryTypographyProps={{ variant: "caption" }}
                sx={{ pr: canMarkNext(task) ? 14 : 0 }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export default function StaffProgressCard({ member, onChanged }: StaffProgressCardProps) {
  const { showError, showSuccess } = useFeedback();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const progress = useMemo(() => computeStaffProgress(member), [member]);
  const tasks = useMemo(() => memberTasks(member), [member]);
  const groups = useMemo(() => groupMemberTasks(tasks), [tasks]);
  const role = jobLabel(member.job_function);
  const presence = formatPresenceLabel(progress.arrivedAt, progress.departureTime, {
    arrival: he.dashboardStaffArrival,
    departure: he.dashboardStaffDeparture,
    notArrived: he.dashboardStaffNotArrived,
  });

  const handleToggleNext = async (task: TimelineTask, enabled: boolean) => {
    setBusyId(task.id);
    try {
      await taskService.setManagerNext(task.id, enabled);
      showSuccess(enabled ? he.managerNextTaskSet : he.managerNextTaskCleared);
      onChanged?.();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ mb: 1.5, overflow: "hidden" }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{
          p: 2,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <Box minWidth={0}>
            <Typography fontWeight={800} noWrap>
              {member.full_name}
              {role && (
                <Typography component="span" color="text.secondary" fontWeight={600}>
                  {" · "}
                  {role}
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
              {presence}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.75} flexShrink={0}>
            <Chip
              size="small"
              color={
                member.status === "in_progress"
                  ? "warning"
                  : progress.arrivedAt
                    ? "success"
                    : "default"
              }
              label={
                member.status === "in_progress"
                  ? he.teamInProgress
                  : progress.arrivedAt
                    ? he.dashboardStaffPresent
                    : he.dashboardStaffNotArrived
              }
            />
            <ExpandMoreIcon
              sx={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                color: "text.secondary",
              }}
            />
          </Box>
        </Box>

        <StaffProgressBar segments={progress.segments} total={progress.total} />
        <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
          {he.dashboardTasksProgress(progress.segments.approved, progress.total)}
          {" · "}
          {he.dashboardStaffSegAwaiting}: {progress.segments.awaiting_approval}
          {" · "}
          {he.dashboardStaffSegAttention}: {progress.segments.attention}
        </Typography>
      </Box>

      <Collapse in={open}>
        <Box px={2} pb={2} pt={0} borderTop="1px solid" borderColor="divider">
          {tasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" mt={1.5}>
              {he.dashboardNoTimelineTasks}
            </Typography>
          ) : (
            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                {he.managerNextTaskHint}
              </Typography>
              <TaskGroup
                title={he.dashboardStaffGroupInProgress}
                tasks={groups.inProgress}
                busyId={busyId}
                onToggleNext={handleToggleNext}
              />
              <TaskGroup
                title={he.dashboardStaffGroupCompleted}
                tasks={groups.completed}
                busyId={busyId}
                onToggleNext={handleToggleNext}
              />
              <TaskGroup
                title={he.dashboardStaffGroupWaiting}
                tasks={groups.waiting}
                busyId={busyId}
                onToggleNext={handleToggleNext}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
