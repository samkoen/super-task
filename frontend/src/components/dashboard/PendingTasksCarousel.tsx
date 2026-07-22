import { useMemo, useState } from "react";
import { Box, Chip, Paper, Typography, alpha } from "@mui/material";
import type { TaskQueues } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import {
  buildPendingTasks,
  filterPendingTasks,
  isFilterAll,
  uniqueAssignees,
  uniqueDepartments,
} from "../../utils/dashboardCarousels";

interface PendingTasksCarouselProps {
  queues: TaskQueues | null | undefined;
}

function statusAccent(status: string): string {
  if (status === "overdue") return "#d32f2f";
  if (status === "in_progress") return "#ed6c02";
  return "#757575";
}

export default function PendingTasksCarousel({ queues }: PendingTasksCarouselProps) {
  const all = useMemo(() => buildPendingTasks(queues), [queues]);
  const [department, setDepartment] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);

  const departments = useMemo(() => uniqueDepartments(all), [all]);
  const assignees = useMemo(() => uniqueAssignees(all), [all]);
  const filtered = useMemo(
    () => filterPendingTasks(all, { department, assignee }),
    [all, department, assignee],
  );

  return (
    <Box mb={3}>
      <Box display="flex" alignItems="baseline" gap={1} mb={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          {he.dashboardPendingCarousel}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ({filtered.length})
        </Typography>
      </Box>

      {(departments.length > 0 || assignees.length > 0) && (
        <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
          <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {he.department}:
            </Typography>
            <Chip
              size="small"
              label={he.dashboardFilterAll}
              color={isFilterAll(department) ? "primary" : "default"}
              variant={isFilterAll(department) ? "filled" : "outlined"}
              onClick={() => setDepartment(null)}
            />
            {departments.map((name) => (
              <Chip
                key={name}
                size="small"
                label={name}
                color={department === name ? "primary" : "default"}
                variant={department === name ? "filled" : "outlined"}
                onClick={() => setDepartment(name === department ? null : name)}
              />
            ))}
          </Box>
          <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {he.roleEmployee}:
            </Typography>
            <Chip
              size="small"
              label={he.dashboardFilterAll}
              color={isFilterAll(assignee) ? "primary" : "default"}
              variant={isFilterAll(assignee) ? "filled" : "outlined"}
              onClick={() => setAssignee(null)}
            />
            {assignees.map((name) => (
              <Chip
                key={name}
                size="small"
                label={name}
                color={assignee === name ? "primary" : "default"}
                variant={assignee === name ? "filled" : "outlined"}
                onClick={() => setAssignee(name === assignee ? null : name)}
              />
            ))}
          </Box>
        </Box>
      )}

      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {all.length === 0
            ? he.dashboardPendingCarouselEmpty
            : he.dashboardPendingCarouselNoMatch}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            overflowX: "auto",
            pb: 1,
            scrollSnapType: "x mandatory",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "action.disabled",
              borderRadius: 3,
            },
          }}
        >
          {filtered.map((task) => {
            const border = statusAccent(task.status);
            return (
              <Paper
                key={task.id}
                variant="outlined"
                sx={{
                  minWidth: 240,
                  maxWidth: 260,
                  flex: "0 0 auto",
                  p: 2,
                  scrollSnapAlign: "start",
                  borderColor: alpha(border, 0.45),
                  borderInlineStartWidth: 4,
                  borderInlineStartColor: border,
                }}
              >
                <Typography fontWeight={800} mb={0.5} noWrap title={task.title}>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[task.assignee_name, task.department_name].filter(Boolean).join(" · ") || "—"}
                </Typography>
                <Box display="flex" gap={0.75} flexWrap="wrap" mt={1}>
                  <Chip
                    size="small"
                    label={`${he.dashboardDueAt} ${formatDueAt(task.due_at)}`}
                    variant="outlined"
                  />
                  {task.status === "overdue" && (
                    <Chip size="small" color="error" label={he.timelineSegmentOverdue} />
                  )}
                  {task.status === "in_progress" && (
                    <Chip size="small" color="warning" label={he.timelineSegmentInProgress} />
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
