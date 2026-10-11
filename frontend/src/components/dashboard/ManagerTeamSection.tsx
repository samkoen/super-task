import { type ReactNode } from "react";
import type { ManagerDashboard, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { dashboardTaskUsesReview } from "../../utils/dashboardTaskOpen";
import DashboardSectionAccordion from "./DashboardSectionAccordion";
import PendingTasksCarousel from "./PendingTasksCarousel";
import StaffProgressOverview from "./StaffProgressOverview";
import StoreStatusAnalysisTable from "./StoreStatusAnalysisTable";
import StoreStatusKpiRow from "./StoreStatusKpiRow";

function openFromDashboard(
  task: TimelineTask,
  onOpenTask: (taskId: string) => void,
  onReviewTask: (taskId: string) => void,
) {
  if (dashboardTaskUsesReview(task.status)) onReviewTask(task.id);
  else onOpenTask(task.id);
}

export default function ManagerTeamSection({
  data,
  title,
  hint,
  showAnalysis,
  analysisExtra,
  onToggleAnalysis,
  onOpenTask,
  onReviewTask,
  onChanged,
}: {
  data: ManagerDashboard;
  title?: string;
  hint?: string;
  showAnalysis: boolean;
  analysisExtra?: ReactNode;
  onToggleAnalysis: () => void;
  onOpenTask: (taskId: string) => void;
  onReviewTask: (taskId: string) => void;
  onChanged: () => void;
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
        onOpenTask={(task) => openFromDashboard(task, onOpenTask, onReviewTask)}
        onOpenStatusAnalysis={onToggleAnalysis}
      />
      {showAnalysis && (
        <>
          <StoreStatusAnalysisTable
            team={data.team}
            onOpenTask={(task) => openFromDashboard(task, onOpenTask, onReviewTask)}
            onClose={onToggleAnalysis}
          />
          {analysisExtra}
        </>
      )}
      <PendingTasksCarousel
        kind="completed"
        queues={data.task_queues}
        onOpenTask={(task) => openFromDashboard(task, onOpenTask, onReviewTask)}
      />
      <StaffProgressOverview
        team={data.team ?? []}
        onChanged={onChanged}
        onOpenTask={(task) => openFromDashboard(task, onOpenTask, onReviewTask)}
      />
    </DashboardSectionAccordion>
  );
}
