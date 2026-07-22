import AddIcon from "@mui/icons-material/Add";
import { Fab } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { he } from "../../i18n/he";
import { managerNewTaskNavigation } from "../../utils/managerBottomNav";

interface ManagerNewTaskFabProps {
  forceVisible?: boolean;
}

export default function ManagerNewTaskFab({ forceVisible = false }: ManagerNewTaskFabProps) {
  const navigate = useNavigate();

  return (
    <Fab
      color="success"
      aria-label={he.dashboardCreateTask}
      onClick={() => {
        const nav = managerNewTaskNavigation();
        navigate(nav.pathname, { state: nav.state });
      }}
      sx={{
        position: "fixed",
        bottom: forceVisible ? 80 : { xs: 80, sm: 24 },
        insetInlineEnd: 16,
        zIndex: (t) => t.zIndex.appBar + 1,
        display: forceVisible ? "inline-flex" : { xs: "inline-flex", sm: "none" },
        bgcolor: "#2e7d32",
        color: "#fff",
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
        "&:hover": { bgcolor: "#1b5e20" },
      }}
    >
      <AddIcon />
    </Fab>
  );
}
