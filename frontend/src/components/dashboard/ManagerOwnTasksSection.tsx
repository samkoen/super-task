import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import type { EmployeeTaskCard, ManagerMyWork } from "../../services/dashboardService";
import EmployeeFinishedTaskSections from "../employee/EmployeeFinishedTaskSections";
import EmployeeTaskSection from "../employee/EmployeeTaskSection";
import EmptyState from "../ui/EmptyState";
import { he } from "../../i18n/he";
import { collectUniqueTasks, splitEmployeeWorkLists } from "../../utils/employeeDashboardSections";

export default function ManagerOwnTasksSection({
  work,
  onOpen,
}: {
  work: ManagerMyWork;
  onOpen: (task: EmployeeTaskCard) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const workLists = useMemo(() => {
    const pool = collectUniqueTasks([
      work.in_progress_tasks,
      work.awaiting_response_tasks,
      work.urgent_tasks,
      work.today_tasks,
    ]);
    return splitEmployeeWorkLists(pool);
  }, [work]);
  const openCount = workLists.dynamic.length + workLists.routine.length;

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
        {he.dashboardMyTasksTitle}
        {openCount > 0 ? ` (${openCount})` : ""}
      </Typography>
      {openCount === 0 ? (
        <EmptyState
          title={he.dashboardMyTasksEmpty}
          icon={<TaskAltOutlinedIcon fontSize="inherit" />}
          compact
        />
      ) : (
        <>
          <EmployeeTaskSection
            title={he.employeeRoutineTasks}
            tasks={workLists.routine}
            onOpen={onOpen}
            layout="list"
          />
          <EmployeeTaskSection
            title={he.employeeDynamicTasks}
            tasks={workLists.dynamic}
            onOpen={onOpen}
            layout="tile"
            color="error.main"
          />
        </>
      )}
      <EmployeeFinishedTaskSections
        pendingReviewTasks={work.pending_review_tasks}
        completedTasks={work.completed_tasks}
        showCompleted={showCompleted}
        onToggleCompleted={() => setShowCompleted((v) => !v)}
        onOpen={onOpen}
      />
    </Box>
  );
}
