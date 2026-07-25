import { useMemo, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import type { TaskQueues, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import {
  buildPendingTasks,
  filterPendingTasks,
  isFilterAll,
  uniqueAssignees,
  uniqueDepartments,
} from "../../utils/dashboardCarousels";
import PendingTaskMediaCard from "./PendingTaskMediaCard";

interface PendingTasksCarouselProps {
  queues: TaskQueues | null | undefined;
  onOpenTask?: (task: TimelineTask) => void;
}

export default function PendingTasksCarousel({
  queues,
  onOpenTask,
}: PendingTasksCarouselProps) {
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
          {filtered.map((task) => (
            <PendingTaskMediaCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </Box>
      )}
    </Box>
  );
}
