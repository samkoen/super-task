import { Box, Typography } from "@mui/material";
import EmployeeTaskRow from "./EmployeeTaskRow";
import type { EmployeeTaskCard } from "../../services/dashboardService";

interface EmployeeTaskSectionProps {
  title: string;
  tasks: EmployeeTaskCard[];
  onOpen: (task: EmployeeTaskCard) => void;
  color?: string;
}

/** Grille de petites tuiles photo. */
export default function EmployeeTaskSection({
  title,
  tasks,
  onOpen,
  color,
}: EmployeeTaskSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <Box mb={2}>
      <Typography
        variant="subtitle2"
        fontWeight={800}
        color={color ?? "text.primary"}
        mb={0.75}
      >
        {title} ({tasks.length})
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
        {tasks.map((task) => (
          <EmployeeTaskRow key={task.id} task={task} onOpen={onOpen} />
        ))}
      </Box>
    </Box>
  );
}
