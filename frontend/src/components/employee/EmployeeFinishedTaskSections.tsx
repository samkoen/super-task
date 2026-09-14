import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import { mergeEmployeeFinishedTasks } from "../../utils/employeeDashboardSections";
import EmployeeTaskRow from "./EmployeeTaskRow";

export default function EmployeeFinishedTaskSections({
  pendingReviewTasks,
  completedTasks,
  showCompleted,
  onToggleCompleted,
  onOpen,
}: {
  pendingReviewTasks: EmployeeTaskCard[];
  completedTasks: EmployeeTaskCard[];
  showCompleted: boolean;
  onToggleCompleted: () => void;
  onOpen: (task: EmployeeTaskCard) => void;
}) {
  const tasks = mergeEmployeeFinishedTasks(pendingReviewTasks, completedTasks);
  if (tasks.length === 0) return null;
  return (
    <CompletedTasksAccordion
      tasks={tasks}
      expanded={showCompleted}
      onToggle={onToggleCompleted}
      onOpen={onOpen}
    />
  );
}

function CompletedTasksAccordion({
  tasks,
  expanded,
  onToggle,
  onOpen,
}: {
  tasks: EmployeeTaskCard[];
  expanded: boolean;
  onToggle: () => void;
  onOpen: (task: EmployeeTaskCard) => void;
}) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{ mt: 1, mb: 2, boxShadow: 0, border: 1, borderColor: "divider" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>
          {expanded ? he.employeeHideCompleted : he.employeeShowCompleted} ({tasks.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1, px: 1.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {tasks.map((task) => (
            <EmployeeTaskRow key={task.id} task={task} onOpen={onOpen} layout="list" />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
