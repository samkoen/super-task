import type { ReactNode } from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { useLocation, useNavigate } from "react-router-dom";
import { he } from "../../i18n/he";
import {
  MANAGER_BOTTOM_NAV_ITEMS,
  resolveManagerBottomTab,
  type ManagerBottomTab,
} from "../../utils/managerBottomNav";

const ICONS: Record<ManagerBottomTab, ReactNode> = {
  home: <DashboardIcon />,
  tasks: <TaskAltIcon />,
  archive: <PhotoLibraryIcon />,
};

const LABELS: Record<ManagerBottomTab, string> = {
  home: he.managerBottomNavHome,
  tasks: he.managerBottomNavTasks,
  archive: he.managerBottomNavArchive,
};

interface ManagerBottomNavProps {
  /** Afficher uniquement en mobile (xs) sauf si forceOverlay (natif). */
  forceVisible?: boolean;
}

export default function ManagerBottomNav({ forceVisible = false }: ManagerBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = resolveManagerBottomTab(location.pathname);

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar,
        display: forceVisible ? "block" : { xs: "block", sm: "none" },
        borderRadius: 0,
        borderTop: 1,
        borderColor: "divider",
        // Force paint WebView
        transform: "translateZ(0)",
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        onChange={(_, value: ManagerBottomTab) => {
          const item = MANAGER_BOTTOM_NAV_ITEMS.find((i) => i.tab === value);
          if (item) navigate(item.path);
        }}
        sx={{ height: 64 }}
      >
        {MANAGER_BOTTOM_NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.tab}
            value={item.tab}
            label={LABELS[item.tab]}
            icon={ICONS[item.tab]}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
