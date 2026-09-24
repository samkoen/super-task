import { type ReactNode } from "react";
import type { EmployeeTaskCard, ManagerDashboard, ManagerMyWork } from "../../services/dashboardService";
import type { DirectChatCard } from "../../services/directChatService";
import { emptyManagerMyWork } from "../../utils/managerUnreadChats";
import { showAllWorkersDashboard } from "../../utils/networkDashboard";
import ManagerActionsSection from "./ManagerActionsSection";
import ManagerOwnTasksSection from "./ManagerOwnTasksSection";
import ManagerTeamSection from "./ManagerTeamSection";

export default function ManagerTodayBoard({
  data,
  title,
  hint,
  showAnalysis,
  analysisExtra,
  chats,
  onToggleAnalysis,
  onReviewTask,
  onOpenTask,
  onOpenOwnTask,
  onOpenChat,
  onOpenTaskChat,
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
  chats: DirectChatCard[];
  onToggleAnalysis: () => void;
  onReviewTask: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenOwnTask: (task: EmployeeTaskCard) => void;
  onOpenChat: (card: DirectChatCard) => void;
  onOpenTaskChat: (taskId: string) => void;
  onChanged: () => void;
  onNewTask: () => void;
  onGalleryTask: () => void;
  onViewTasks: () => void;
}) {
  const work: ManagerMyWork = data.my_work ?? emptyManagerMyWork();
  const showTeam = Boolean(data.branch) || showAllWorkersDashboard(data);
  return (
    <>
      <ManagerActionsSection
        queues={data.task_queues}
        chats={chats}
        onReviewTask={onReviewTask}
        onOpenChat={onOpenChat}
        onOpenTaskChat={onOpenTaskChat}
      />
      <ManagerOwnTasksSection work={work} onOpen={onOpenOwnTask} />
      {showTeam ? (
        <ManagerTeamSection
          data={data}
          title={title}
          hint={hint}
          showAnalysis={showAnalysis}
          analysisExtra={analysisExtra}
          onToggleAnalysis={onToggleAnalysis}
          onOpenTask={onOpenTask}
          onChanged={onChanged}
          onNewTask={onNewTask}
          onGalleryTask={onGalleryTask}
          onViewTasks={onViewTasks}
        />
      ) : null}
    </>
  );
}
