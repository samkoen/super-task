import { type ReactNode } from "react";
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
}: {
  data: ManagerDashboard;
  title?: string;
  hint?: string;
  showAnalysis: boolean;
  analysisExtra?: ReactNode;
  onToggleAnalysis: () => void;
  onOpenTask: (taskId: string) => void;
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
    </DashboardSectionAccordion>
  );
}
