import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { showsHebrewTitle } from "../../utils/employeeTaskCard";

interface EmployeeTaskTitleProps {
  task: {
    title: string;
    title_he?: string | null;
    display_language?: string | null;
  };
  variant?: "h6" | "body1" | "subtitle1";
  fontWeight?: number | string;
}

/** Titre tâche oved (+ sous-titre hébreu si traduction). */
export default function EmployeeTaskTitle({
  task,
  variant = "h6",
  fontWeight = 700,
}: EmployeeTaskTitleProps) {
  return (
    <Box>
      <Typography variant={variant} fontWeight={fontWeight}>
        {task.title}
      </Typography>
      {showsHebrewTitle(task) && (
        <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ mt: 0.25 }}>
          {he.taskTitleHebrew}: {task.title_he}
        </Typography>
      )}
    </Box>
  );
}
