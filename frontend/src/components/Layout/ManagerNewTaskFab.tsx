import AddIcon from "@mui/icons-material/Add";
import { Fab, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { he } from "../../i18n/he";
import { managerFabBottomCss, managerNewTaskNavigation } from "../../utils/managerBottomNav";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_GRADIENT } from "../../styles/employeeUi";

interface ManagerNewTaskFabProps {
  forceVisible?: boolean;
}

export default function ManagerNewTaskFab({ forceVisible = false }: ManagerNewTaskFabProps) {
  const navigate = useNavigate();

  return (
    <Fab
      aria-label={he.dashboardCreateTask}
      onClick={() => {
        const nav = managerNewTaskNavigation();
        navigate(nav.pathname, { state: nav.state });
      }}
      sx={{
        position: "fixed",
        bottom: forceVisible ? managerFabBottomCss() : { xs: managerFabBottomCss(), sm: 24 },
        insetInlineEnd: 16,
        zIndex: (t) => t.zIndex.appBar + 1,
        display: forceVisible ? "inline-flex" : { xs: "inline-flex", sm: "none" },
        width: 60,
        height: 60,
        background: EMPLOYEE_BRAND_GRADIENT,
        color: "#fff",
        boxShadow: `0 10px 24px ${alpha(EMPLOYEE_BRAND, 0.45)}`,
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
        "&:hover": { background: EMPLOYEE_BRAND_GRADIENT, filter: "brightness(0.95)" },
      }}
    >
      <AddIcon sx={{ fontSize: 32 }} />
    </Fab>
  );
}
