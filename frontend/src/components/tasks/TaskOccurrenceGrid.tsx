import { Grid2 as Grid, Typography } from "@mui/material";
import TaskOccurrenceCard, { type TaskOccurrenceCardProps } from "./TaskOccurrenceCard";
import { he } from "../../i18n/he";
import type { TaskOccurrence } from "../../services/taskService";

export interface TaskOccurrenceGridProps {
  tasks: TaskOccurrence[];
  emptyMessage?: string;
  isBranchManager?: boolean;
  onDelegate?: TaskOccurrenceCardProps["onDelegate"];
  onCancel?: TaskOccurrenceCardProps["onCancel"];
}

export default function TaskOccurrenceGrid({
  tasks,
  emptyMessage = he.noTasks,
  isBranchManager,
  onDelegate,
  onCancel,
}: TaskOccurrenceGridProps) {
  if (tasks.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" py={6}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {tasks.map((task, index) => (
        <Grid key={task.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          <TaskOccurrenceCard
            task={task}
            index={index}
            isBranchManager={isBranchManager}
            onDelegate={onDelegate}
            onCancel={onCancel}
          />
        </Grid>
      ))}
    </Grid>
  );
}
