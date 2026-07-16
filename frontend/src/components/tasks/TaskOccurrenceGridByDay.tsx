import { Box, Typography } from "@mui/material";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EmptyState from "../ui/EmptyState";
import TaskOccurrenceGrid, { type TaskOccurrenceGridProps } from "./TaskOccurrenceGrid";
import { formatHebrewDay, groupTasksByDay, isToday } from "../../utils/dateView";
import { he } from "../../i18n/he";
import type { TaskOccurrence } from "../../services/taskService";

export interface TaskOccurrenceGridByDayProps extends Omit<TaskOccurrenceGridProps, "tasks"> {
  tasks: TaskOccurrence[];
}

export default function TaskOccurrenceGridByDay({
  tasks,
  emptyMessage = he.noTasks,
  emptyDescription = he.noTasksHint,
  ...gridProps
}: TaskOccurrenceGridByDayProps) {
  const groups = groupTasksByDay(tasks);

  if (groups.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        icon={<TaskAltOutlinedIcon fontSize="inherit" />}
      />
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {groups.map(([day, dayTasks]) => (
        <Box key={day}>
          <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
            {isToday(day) ? he.tasksTodayLabel : formatHebrewDay(day)}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({dayTasks.length})
            </Typography>
          </Typography>
          <TaskOccurrenceGrid tasks={dayTasks} {...gridProps} />
        </Box>
      ))}
    </Box>
  );
}
