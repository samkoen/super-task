import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  CssBaseline,
  Drawer,
  Fab,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import StoreIcon from "@mui/icons-material/Store";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NotificationBell from "../notifications/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { useTaskEventSource } from "../../hooks/useTaskEventSource";
import { he } from "../../i18n/he";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import {
  sidebarHeaderSx,
  sidebarNavButtonSx,
  sidebarNavIconSx,
  sidebarNavTextSx,
} from "../../styles/hebrewAlign";

const drawerPaperSx = {
  boxSizing: "border-box" as const,
  width: SIDEBAR_WIDTH,
  height: "100vh",
  maxHeight: "100vh",
  overflow: "hidden",
  border: "none",
  bgcolor: "background.paper",
  borderInlineStart: `1px solid ${alpha("#1A2332", 0.08)}`,
};

function Layout() {
  const { user, logout } = useAuth();
  useTaskEventSource(Boolean(user));
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEmployee = user?.role === "employee";

  const menuItems = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") {
      return [
        { text: he.adminArea, icon: <DashboardIcon />, path: "/admin" },
        { text: he.adminNetworks, icon: <BusinessIcon />, path: "/admin/networks" },
        { text: he.adminBranches, icon: <StoreIcon />, path: "/admin/branches" },
        { text: he.adminDepartments, icon: <CategoryIcon />, path: "/admin/departments" },
        { text: he.adminProducts, icon: <InventoryIcon />, path: "/admin/products" },
        { text: he.managerTasks, icon: <TaskAltIcon />, path: "/admin/tasks" },
        { text: he.adminUsers, icon: <PeopleIcon />, path: "/admin/users" },
        { text: he.invitations, icon: <MailOutlineIcon />, path: "/admin/invitations" },
      ];
    }
    if (user.role === "network_manager" || user.role === "branch_manager") {
      return [
        { text: he.managerArea, icon: <DashboardIcon />, path: "/manager" },
        { text: he.adminBranches, icon: <StoreIcon />, path: "/manager/branches" },
        { text: he.adminDepartments, icon: <CategoryIcon />, path: "/manager/departments" },
        { text: he.adminProducts, icon: <InventoryIcon />, path: "/manager/products" },
        { text: he.managerTasks, icon: <TaskAltIcon />, path: "/manager/tasks" },
        { text: he.invitations, icon: <MailOutlineIcon />, path: "/manager/invitations" },
      ];
    }
    return [{ text: he.employeeArea, icon: <DashboardIcon />, path: "/employee" }];
  }, [user]);

  const handleLogout = () => {
    void logout();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Box sx={{ ...sidebarHeaderSx, borderBottomColor: alpha("#fff", 0.12) }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Box minWidth={0}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {he.appName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }} noWrap>
              {user?.full_name}
            </Typography>
          </Box>
          <NotificationBell />
        </Box>
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {menuItems.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => handleNavigation(item.path)}
              sx={{
                ...sidebarNavButtonSx,
                borderRadius: 2,
                mb: 0.5,
                color: "inherit",
                "&.Mui-selected": {
                  bgcolor: alpha("#fff", 0.16),
                  "&:hover": { bgcolor: alpha("#fff", 0.22) },
                },
                "&:hover": { bgcolor: alpha("#fff", 0.1) },
              }}
            >
              <ListItemIcon sx={{ ...sidebarNavIconSx, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                slotProps={{ primary: { sx: sidebarNavTextSx } }}
              />
              <ChevronRightIcon sx={{ fontSize: 18, opacity: 0.7 }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: `1px solid ${alpha("#fff", 0.12)}` }}>
        <Button
          fullWidth
          type="button"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: "inherit",
            ...sidebarNavButtonSx,
          }}
        >
          {he.logout}
        </Button>
      </Box>
    </Box>
  );

  if (isEmployee) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
            py: 1.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <Typography variant="subtitle1" fontWeight={800}>{he.appName}</Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <NotificationBell />
            <Button
            type="button"
            color="inherit"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={sidebarNavButtonSx}
          >
            {he.logout}
          </Button>
          </Box>
        </Box>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 2 }}>
          <Outlet />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      <CssBaseline />

      <Fab
        size="small"
        color="primary"
        aria-label={he.mainMenu}
        onClick={() => setMobileOpen(true)}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: { xs: "inline-flex", sm: "none" },
        }}
      >
        <MenuIcon />
      </Fab>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { ...drawerPaperSx, position: "fixed" },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        anchor="left"
        open
        sx={{
          display: { xs: "none", sm: "block" },
          flexShrink: 0,
          order: 0,
          width: SIDEBAR_WIDTH,
          "&.MuiDrawer-docked": {
            position: "relative",
            height: "100vh",
          },
          "& .MuiDrawer-paper": {
            ...drawerPaperSx,
            position: "relative",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: "1 1 0",
          minWidth: 0,
          width: 0,
          order: 1,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 2, sm: 3 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
