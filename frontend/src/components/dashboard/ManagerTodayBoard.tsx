import { type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import type { ManagerDashboard } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import ActionRequiredCarousel from "./ActionRequiredCarousel";
import PendingTasksCarousel from "./PendingTasksCarousel";
import StaffProgressOverview from "./StaffProgressOverview";
import StoreStatusAnalysisTable from "./StoreStatusAnalysisTable";
import StoreStatusKpiRow from "./StoreStatusKpiRow";

const SHOW_STAFF_PROGRESS = true;

export default function ManagerTodayBoard({
  data,
  title,
  hint,
  showAnalysis,
  analysisExtra,
  onToggleAnalysis,
  onReviewTask,
  onOpenTask,
  onChanged,
  onNewTask,
  onGalleryTask,
  onViewTasks,
}: {
  data: ManagerDashboard;
  title?: string;
  hint?: string;
  showAnalysis: boolean;
  analysisExtra?: ReactNode;
  onToggleAnalysis: () => void;
  onReviewTask: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onChanged: () => void;
  onNewTask: () => void;
  onGalleryTask: () => void;
  onViewTasks: () => void;
}) {
  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} mb={hint ? 0.5 : 1.5}>
        {title ?? he.dashboardToday}
      </Typography>
      {hint ? (
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          {hint}
        </Typography>
      ) : null}
      <StoreStatusKpiRow storeKpis={data.store_kpis} />
      <ActionRequiredCarousel
        queues={data.task_queues}
        mode="questions"
        onReviewTask={onReviewTask}
      />
      <PendingTasksCarousel
        queues={data.task_queues}
        onOpenTask={(task) => onOpenTask(task.id)}
        onOpenStatusAnalysis={onToggleAnalysis}
      />
      {showAnalysis && (
        <>
          <StoreStatusAnalysisTable
            team={data.team}
            onOpenTask={(task) => onOpenTask(task.id)}
            onClose={onToggleAnalysis}
          />
          {analysisExtra}
        </>
      )}
      <ActionRequiredCarousel
        queues={data.task_queues}
        mode="reviews"
        onReviewTask={onReviewTask}
      />
      {SHOW_STAFF_PROGRESS && (
        <StaffProgressOverview team={data.team ?? []} onChanged={onChanged} />
      )}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNewTask}>
          {he.newTask}
        </Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onGalleryTask}>
          {he.newTaskFromGallery}
        </Button>
        <Button variant="outlined" startIcon={<TaskAltIcon />} onClick={onViewTasks}>
          {he.dashboardViewTasks}
        </Button>
      </Box>
    </>
  );
}
