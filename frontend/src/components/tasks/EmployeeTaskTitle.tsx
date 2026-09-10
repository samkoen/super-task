import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import type { OpsCategory } from "../../services/taskService";
import { showsHebrewTitle } from "../../utils/employeeTaskCard";
import OpsCategoryIcon from "./OpsCategoryIcon";

interface EmployeeTaskTitleProps {
  task: {
    title: string;
    title_he?: string | null;
    display_language?: string | null;
    ops_category?: OpsCategory | null;
  };
  variant?: "h6" | "body1" | "subtitle1";
  fontWeight?: number | string;
}

/** Titre tâche oved (+ icône de type, sous-titre hébreu si traduction). */
export default function EmployeeTaskTitle({
  task,
  variant = "h6",
  fontWeight = 700,
}: EmployeeTaskTitleProps) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
        <OpsCategoryIcon category={task.ops_category} fontSize={20} />
        <Typography variant={variant} fontWeight={fontWeight} sx={{ minWidth: 0 }}>
          {task.title}
        </Typography>
      </Box>
      {showsHebrewTitle(task) && (
        <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ mt: 0.25 }}>
          {he.taskTitleHebrew}: {task.title_he}
        </Typography>
      )}
    </Box>
  );
}
