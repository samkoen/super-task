import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import type { TaskQueues, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDurationMinutes, formatTime } from "../../utils/dashboardTime";
import {
  isLongInProgress,
  sortCompletedByEmployee,
  sortCompletedTasks,
  sortInProgressTasks,
} from "../../utils/dashboardTimelineLayout";
import DashboardSectionAccordion from "./DashboardSectionAccordion";

type QueueTab = "completed" | "in_progress" | "pending_review" | "upcoming";
type CompletedSort = "time" | "employee";

function normalizeQueues(queues: TaskQueues): Required<TaskQueues> {
  return {
    completed: queues.completed ?? [],
    in_progress: queues.in_progress ?? [],
    pending_review: queues.pending_review ?? [],
    upcoming: queues.upcoming ?? [],
  };
}

function QueueItem({
  task,
  showLongAlert,
  onReview,
}: {
  task: TimelineTask;
  showLongAlert?: boolean;
  onReview?: (taskId: string) => void;
}) {
  const secondaryParts = [task.assignee_name, task.department_name];

  if (task.segment === "completed" && task.duration_minutes != null) {
    secondaryParts.push(`${he.dashboardDuration}: ${formatDurationMinutes(task.duration_minutes)}`);
    if (task.completed_at) {
      secondaryParts.push(`${he.dashboardCompletedAt} ${formatTime(task.completed_at)}`);
    }
  } else if (task.segment === "pending_review") {
    if (task.completed_at) {
      secondaryParts.push(`${he.dashboardSubmittedAt} ${formatTime(task.completed_at)}`);
    }
  } else if (task.segment === "in_progress") {
    if (task.started_at) {
      secondaryParts.push(`${he.dashboardStartedAt} ${formatTime(task.started_at)}`);
    }
    if (task.elapsed_minutes != null) {
      secondaryParts.push(formatDurationMinutes(task.elapsed_minutes));
    }
  } else {
    secondaryParts.push(`${he.dashboardDueAt} ${formatTime(task.due_at)}`);
  }

  return (
    <ListItem divider sx={{ px: 0, flexDirection: "column", alignItems: "stretch" }}>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography component="span" fontWeight={700}>
              {task.title}
            </Typography>
            {task.segment === "in_progress" && (
              <Chip label={he.timelineSegmentInProgress} size="small" color="warning" />
            )}
            {task.segment === "pending_review" && (
              <Chip label={he.timelineSegmentPendingReview} size="small" color="info" />
            )}
            {showLongAlert && (
              <Chip label={he.dashboardInProgressLong} size="small" color="error" />
            )}
          </Box>
        }
        secondary={secondaryParts.filter(Boolean).join(" · ")}
      />
      {task.segment === "pending_review" && onReview && (
        <Button
          size="small"
          variant="contained"
          color="info"
          startIcon={<RateReviewIcon />}
          onClick={() => onReview(task.id)}
          sx={{ alignSelf: "flex-start", mt: 0.5 }}
        >
          {he.taskReviewAction}
        </Button>
      )}
    </ListItem>
  );
}

export interface TaskQueuePanelProps {
  queues: TaskQueues;
  onReviewTask?: (taskId: string) => void;
}

export default function TaskQueuePanel({ queues, onReviewTask }: TaskQueuePanelProps) {
  const normalized = useMemo(() => normalizeQueues(queues), [queues]);
  const defaultTab: QueueTab =
    normalized.pending_review.length > 0 ? "pending_review" : "in_progress";
  const [tab, setTab] = useState<QueueTab>(defaultTab);
  const [completedSort, setCompletedSort] = useState<CompletedSort>("time");

  const sortedQueues = useMemo(() => {
    const completed =
      completedSort === "employee"
        ? sortCompletedByEmployee(normalized.completed)
        : sortCompletedTasks(normalized.completed);
    return {
      completed,
      in_progress: sortInProgressTasks(normalized.in_progress),
      pending_review: [...normalized.pending_review].sort(
        (a, b) =>
          new Date(b.completed_at ?? b.due_at).getTime() -
          new Date(a.completed_at ?? a.due_at).getTime(),
      ),
      upcoming: [...normalized.upcoming].sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
      ),
    };
  }, [normalized, completedSort]);

  const labels: Record<QueueTab, string> = {
    completed: he.dashboardQueueCompleted,
    in_progress: he.dashboardQueueInProgress,
    pending_review: he.dashboardQueuePendingReview,
    upcoming: he.dashboardQueueUpcoming,
  };

  const totalCount =
    normalized.completed.length +
    normalized.in_progress.length +
    normalized.pending_review.length +
    normalized.upcoming.length;
  const longInProgressCount = sortedQueues.in_progress.filter(isLongInProgress).length;
  const activeList = sortedQueues[tab];

  const summaryHint =
    totalCount === 0
      ? he.noTasks
      : [
          normalized.pending_review.length > 0
            ? `${normalized.pending_review.length} ${he.dashboardQueuePendingReview}`
            : null,
          `${normalized.in_progress.length} ${he.dashboardQueueInProgress}`,
          `${normalized.upcoming.length} ${he.dashboardQueueUpcoming}`,
        ]
          .filter(Boolean)
          .join(" · ");

  const countColor =
    normalized.pending_review.length > 0
      ? "info"
      : normalized.in_progress.length > 0
        ? "warning"
        : "primary";

  return (
    <DashboardSectionAccordion
      title={he.dashboardTaskQueues}
      count={totalCount}
      countColor={countColor}
      summaryHint={summaryHint}
      mb={0}
    >
      {normalized.pending_review.length > 0 && tab !== "pending_review" && (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          {`${normalized.pending_review.length} ${he.dashboardQueuePendingReview}`}
        </Alert>
      )}

      {longInProgressCount > 0 && tab === "in_progress" && (
        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
          {he.dashboardInProgressLongCount(longInProgressCount)}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, value: QueueTab) => setTab(value)}
        sx={{ mb: 1, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5 } }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {(Object.keys(sortedQueues) as QueueTab[]).map((key) => (
          <Tab key={key} value={key} label={`${labels[key]} (${sortedQueues[key].length})`} />
        ))}
      </Tabs>

      {tab === "completed" && sortedQueues.completed.length > 0 && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={completedSort}
          onChange={(_, value: CompletedSort | null) => value && setCompletedSort(value)}
          sx={{ mb: 1 }}
        >
          <ToggleButton value="time">{he.dashboardQueueSortByTime}</ToggleButton>
          <ToggleButton value="employee">{he.dashboardQueueSortByEmployee}</ToggleButton>
        </ToggleButtonGroup>
      )}

      {activeList.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.noTasks}
        </Typography>
      ) : (
        <List dense disablePadding>
          {activeList.map((task) => (
            <QueueItem
              key={task.id}
              task={task}
              showLongAlert={tab === "in_progress" && isLongInProgress(task)}
              onReview={tab === "pending_review" ? onReviewTask : undefined}
            />
          ))}
        </List>
      )}
    </DashboardSectionAccordion>
  );
}
