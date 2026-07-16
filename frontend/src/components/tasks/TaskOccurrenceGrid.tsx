import { Grid2 as Grid } from "@mui/material";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EmptyState from "../ui/EmptyState";
import TaskOccurrenceCard, { type TaskOccurrenceCardProps } from "./TaskOccurrenceCard";
import { he } from "../../i18n/he";
import type { TaskOccurrence } from "../../services/taskService";

export interface TaskOccurrenceGridProps {
  tasks: TaskOccurrence[];
  emptyMessage?: string;
  emptyDescription?: string;
  isBranchManager?: boolean;
  onDelegate?: TaskOccurrenceCardProps["onDelegate"];
  onEdit?: TaskOccurrenceCardProps["onEdit"];
  onCancel?: TaskOccurrenceCardProps["onCancel"];
  onReview?: TaskOccurrenceCardProps["onReview"];
}

export default function TaskOccurrenceGrid({
  tasks,
  emptyMessage = he.noTasks,
  emptyDescription = he.noTasksHint,
  isBranchManager,
  onDelegate,
  onEdit,
  onCancel,
  onReview,
}: TaskOccurrenceGridProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        icon={<TaskAltOutlinedIcon fontSize="inherit" />}
      />
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
            onEdit={onEdit}
            onCancel={onCancel}
            onReview={onReview}
          />
        </Grid>
      ))}
    </Grid>
  );
}
