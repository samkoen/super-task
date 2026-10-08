import type { ReactNode } from "react";
import { BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { he } from "../../i18n/he";
import {
  MANAGER_BOTTOM_NAV_HEIGHT_PX,
  MANAGER_BOTTOM_NAV_ITEMS,
  managerBottomNavPath,
  resolveManagerBottomTab,
  type ManagerBottomTab,
} from "../../utils/managerBottomNav";
import { bottomNavActionSx, bottomNavBarSx, bottomNavRailSx } from "../../styles/bottomNavUi";

const ICONS: Record<ManagerBottomTab, ReactNode> = {
  home: <DashboardRoundedIcon />,
  tasks: <TaskAltIcon />,
  archive: <PhotoLibraryOutlinedIcon />,
};

const LABELS: Record<ManagerBottomTab, string> = {
  home: he.managerBottomNavHome,
  tasks: he.managerBottomNavTasks,
  archive: he.managerBottomNavArchive,
};

const actionSx = bottomNavActionSx(26);

interface ManagerBottomNavProps {
  /** Afficher uniquement en mobile (xs) sauf si forceOverlay (natif). */
  forceVisible?: boolean;
}

export default function ManagerBottomNav({ forceVisible = false }: ManagerBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = resolveManagerBottomTab(location.pathname);

  return (
    <Box sx={{ ...bottomNavRailSx, display: forceVisible ? "flex" : { xs: "flex", sm: "none" } }}>
      <Paper component="nav" aria-label={he.employeeBottomNavLabel} elevation={0} sx={bottomNavBarSx}>
        <BottomNavigation
          showLabels
          value={active}
          onChange={(_, value: ManagerBottomTab) => {
            const item = MANAGER_BOTTOM_NAV_ITEMS.find((i) => i.tab === value);
            if (item) navigate(managerBottomNavPath(item.path));
          }}
          sx={{ height: MANAGER_BOTTOM_NAV_HEIGHT_PX, bgcolor: "transparent" }}
        >
          {MANAGER_BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.tab}
              value={item.tab}
              label={LABELS[item.tab]}
              aria-label={LABELS[item.tab]}
              icon={ICONS[item.tab]}
              sx={actionSx}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
