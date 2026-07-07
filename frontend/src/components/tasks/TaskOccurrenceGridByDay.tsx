import { Box, Typography } from "@mui/material";
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
  ...gridProps
}: TaskOccurrenceGridByDayProps) {
  const groups = groupTasksByDay(tasks);

  if (groups.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" py={6}>
        {emptyMessage}
      </Typography>
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
