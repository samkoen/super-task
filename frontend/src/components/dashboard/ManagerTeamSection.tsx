import { type ReactNode } from "react";
import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import type { ManagerDashboard } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import DashboardSectionAccordion from "./DashboardSectionAccordion";
import PendingTasksCarousel from "./PendingTasksCarousel";
import StaffProgressOverview from "./StaffProgressOverview";
import StoreStatusAnalysisTable from "./StoreStatusAnalysisTable";
import StoreStatusKpiRow from "./StoreStatusKpiRow";

export default function ManagerTeamSection({
  data,
  title,
  hint,
  showAnalysis,
  analysisExtra,
  onToggleAnalysis,
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
  onOpenTask: (taskId: string) => void;
  onChanged: () => void;
  onNewTask: () => void;
  onGalleryTask: () => void;
  onViewTasks: () => void;
}) {
  const teamCount = data.team?.length ?? 0;
  return (
    <DashboardSectionAccordion
      title={title ?? he.dashboardTeamSectionTitle}
      count={teamCount || undefined}
      summaryHint={hint}
      defaultExpanded={false}
    >
      <StoreStatusKpiRow storeKpis={data.store_kpis} />
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
      <PendingTasksCarousel
        kind="completed"
        queues={data.task_queues}
        onOpenTask={(task) => onOpenTask(task.id)}
      />
      <StaffProgressOverview team={data.team ?? []} onChanged={onChanged} />
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
    </DashboardSectionAccordion>
  );
}
