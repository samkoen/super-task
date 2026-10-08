import type { ReactNode } from "react";
import { Badge, BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { he } from "../../i18n/he";
import { useAuth } from "../../context/AuthContext";
import { useEmployeeChatUnread } from "../../hooks/useEmployeeChatUnread";
import {
  EMPLOYEE_BOTTOM_NAV_HEIGHT_PX,
  EMPLOYEE_BOTTOM_NAV_ITEMS,
  resolveEmployeeBottomTab,
  type EmployeeBottomTab,
} from "../../utils/employeeBottomNav";
import { bottomNavActionSx, bottomNavBarSx, bottomNavRailSx } from "../../styles/bottomNavUi";

const LABELS: Record<EmployeeBottomTab, string> = {
  tasks: he.employeeBottomNavTasks,
  chats: he.employeeBottomNavChats,
  account: he.employeeBottomNavAccount,
};

function tabIcon(tab: EmployeeBottomTab, unread: number): ReactNode {
  if (tab === "tasks") return <ChecklistRoundedIcon />;
  if (tab === "account") return <PersonOutlineRoundedIcon />;
  return (
    <Badge badgeContent={unread} color="error" max={99}>
      <ChatBubbleOutlineRoundedIcon />
    </Badge>
  );
}

const actionSx = bottomNavActionSx();

/** Trois grands onglets, toujours visibles : plus besoin de chercher un menu. */
export default function EmployeeBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const unread = useEmployeeChatUnread(true, user?.role);
  const active = resolveEmployeeBottomTab(location.pathname);

  return (
    <Box sx={bottomNavRailSx}>
      <Paper component="nav" aria-label={he.employeeBottomNavLabel} elevation={0} sx={bottomNavBarSx}>
        <BottomNavigation
          showLabels
          value={active}
          onChange={(_, value: EmployeeBottomTab) => {
            const item = EMPLOYEE_BOTTOM_NAV_ITEMS.find((i) => i.tab === value);
            if (item) navigate(item.path);
          }}
          sx={{ height: EMPLOYEE_BOTTOM_NAV_HEIGHT_PX, bgcolor: "transparent" }}
        >
          {EMPLOYEE_BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.tab}
              value={item.tab}
              label={LABELS[item.tab]}
              aria-label={LABELS[item.tab]}
              icon={tabIcon(item.tab, unread)}
              sx={actionSx}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
