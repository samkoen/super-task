import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_GRADIENT } from "../../styles/employeeUi";

interface ManagerQuickActionsProps {
  onNewTask: () => void;
  onGalleryTask: () => void;
  onViewTasks: () => void;
}

const buttonSx = {
  minHeight: 52,
  borderRadius: "14px",
  fontWeight: 800,
  fontSize: "1rem",
  flex: { xs: "1 1 calc(50% - 6px)", sm: "1 1 0" },
} as const;

/** Raccourcis toujours visibles : créer une tâche (principal), galerie, banque de tâches. */
export default function ManagerQuickActions({
  onNewTask,
  onGalleryTask,
  onViewTasks,
}: ManagerQuickActionsProps) {
  return (
    <Box
      component="section"
      aria-label={he.managerQuickActionsLabel}
      sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}
    >
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onNewTask}
        sx={{
          ...buttonSx,
          flexBasis: { xs: "100%", sm: 0 },
          color: "#fff",
          background: EMPLOYEE_BRAND_GRADIENT,
        }}
      >
        {he.newTask}
      </Button>
      <Button
        variant="outlined"
        startIcon={<CollectionsOutlinedIcon />}
        onClick={onGalleryTask}
        sx={{ ...buttonSx, borderWidth: 2, color: EMPLOYEE_BRAND, "&:hover": { borderWidth: 2 } }}
      >
        {he.newTaskFromGallery}
      </Button>
      <Button
        variant="outlined"
        startIcon={<TaskAltIcon />}
        onClick={onViewTasks}
        sx={{ ...buttonSx, borderWidth: 2, color: EMPLOYEE_BRAND, "&:hover": { borderWidth: 2 } }}
      >
        {he.dashboardViewTasks}
      </Button>
    </Box>
  );
}
