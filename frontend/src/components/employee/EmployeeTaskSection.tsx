import { Box, Typography } from "@mui/material";
import EmployeeTaskRow from "./EmployeeTaskRow";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import { employeeSectionTitleSx } from "../../styles/employeeUi";

interface EmployeeTaskSectionProps {
  title: string;
  tasks: EmployeeTaskCard[];
  onOpen: (task: EmployeeTaskCard) => void;
  color?: string;
  layout?: "tile" | "list";
}

/** קבועות : lignes. מזדמנות : cartes avec photo. Toujours une seule colonne. */
export default function EmployeeTaskSection({
  title,
  tasks,
  onOpen,
  color,
  layout = "tile",
}: EmployeeTaskSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <Box mb={2.5}>
      <Typography component="h2" sx={{ ...employeeSectionTitleSx, color: color ?? "text.primary" }}>
        <Box
          aria-hidden
          sx={{ width: 8, height: 22, borderRadius: 4, bgcolor: color ?? "primary.main" }}
        />
        {`${title} (${tasks.length})`}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {tasks.map((task) => (
          <EmployeeTaskRow key={task.id} task={task} onOpen={onOpen} layout={layout} />
        ))}
      </Box>
    </Box>
  );
}
