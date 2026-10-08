import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, alpha } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import { mergeEmployeeFinishedTasks } from "../../utils/employeeDashboardSections";
import EmployeeTaskRow from "./EmployeeTaskRow";
import { employeeCardSx } from "../../styles/employeeUi";

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

const SUCCESS = "#15803D";

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
      disableGutters
      sx={{
        ...employeeCardSx,
        mt: 1,
        mb: 2.5,
        overflow: "hidden",
        "&::before": { display: "none" },
        "&.Mui-expanded": { mt: 1, mb: 2.5 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 64, px: 2, bgcolor: alpha(SUCCESS, 0.05) }}
      >
        <Box display="flex" alignItems="center" gap={1.25}>
          <CheckCircleIcon sx={{ color: SUCCESS }} />
          <Typography fontWeight={800}>
            {`${expanded ? he.employeeHideCompleted : he.employeeShowCompleted} (${tasks.length})`}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1.5, px: 1.5, pb: 1.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {tasks.map((task) => (
            <EmployeeTaskRow key={task.id} task={task} onOpen={onOpen} layout="list" />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
