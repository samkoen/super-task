import { Box, Typography } from "@mui/material";
import EmployeeTaskRow from "./EmployeeTaskRow";
import type { EmployeeTaskCard } from "../../services/dashboardService";

interface EmployeeTaskSectionProps {
  title: string;
  tasks: EmployeeTaskCard[];
  onOpen: (task: EmployeeTaskCard) => void;
  color?: string;
  layout?: "tile" | "list";
}

/** קבועות : liste. מזדמנות : tuiles photo. */
export default function EmployeeTaskSection({
  title,
  tasks,
  onOpen,
  color,
  layout = "tile",
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
      <Box
        sx={
          layout === "list"
            ? { display: "flex", flexDirection: "column", gap: 0.75 }
            : { display: "flex", flexWrap: "wrap", gap: 1.25 }
        }
      >
        {tasks.map((task) => (
          <EmployeeTaskRow key={task.id} task={task} onOpen={onOpen} layout={layout} />
        ))}
      </Box>
    </Box>
  );
}
