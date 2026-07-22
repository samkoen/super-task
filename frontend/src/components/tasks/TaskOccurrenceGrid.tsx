import { Box, Grid2 as Grid } from "@mui/material";
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
  /** grid = multi-colonnes (menahel) ; stack = une sous l'autre, centrée (oved). */
  layout?: "grid" | "stack";
  urgentIds?: Set<string>;
  startingId?: string | null;
  speakingId?: string | null;
  onEdit?: TaskOccurrenceCardProps["onEdit"];
  onCancel?: TaskOccurrenceCardProps["onCancel"];
  onReview?: TaskOccurrenceCardProps["onReview"];
  onSetManagerNext?: TaskOccurrenceCardProps["onSetManagerNext"];
  onOpen?: TaskOccurrenceCardProps["onOpen"];
  onStart?: TaskOccurrenceCardProps["onStart"];
  onComplete?: TaskOccurrenceCardProps["onComplete"];
  onListen?: TaskOccurrenceCardProps["onListen"];
  onStopListen?: TaskOccurrenceCardProps["onStopListen"];
  onChatUpdated?: TaskOccurrenceCardProps["onChatUpdated"];
}

export default function TaskOccurrenceGrid({
  tasks,
  emptyMessage = he.noTasks,
  emptyDescription = he.noTasksHint,
  isBranchManager,
  layout = "grid",
  urgentIds,
  startingId,
  speakingId,
  onEdit,
  onCancel,
  onReview,
  onSetManagerNext,
  onOpen,
  onStart,
  onComplete,
  onListen,
  onStopListen,
  onChatUpdated,
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

  const renderCard = (task: TaskOccurrence, index: number) => (
    <TaskOccurrenceCard
      task={task}
      index={index}
      isBranchManager={isBranchManager}
      urgent={urgentIds?.has(task.id)}
      onEdit={onEdit}
      onCancel={onCancel}
      onReview={onReview}
      onSetManagerNext={onSetManagerNext}
      onOpen={onOpen}
      onStart={onStart}
      onComplete={onComplete}
      onListen={onListen}
      onStopListen={onStopListen}
      onChatUpdated={onChatUpdated}
      starting={startingId === task.id}
      speaking={speakingId === task.id}
    />
  );

  if (layout === "stack") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2.5}
        sx={{ width: "100%" }}
      >
        {tasks.map((task, index) => (
          <Box key={task.id} sx={{ width: "100%", maxWidth: 720 }}>
            {renderCard(task, index)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {tasks.map((task, index) => (
        <Grid key={task.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          {renderCard(task, index)}
        </Grid>
      ))}
    </Grid>
  );
}
