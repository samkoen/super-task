import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Drawer,
  Fab,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import ListSkeleton from "../ui/ListSkeleton";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import StoreIcon from "@mui/icons-material/Store";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import RepeatIcon from "@mui/icons-material/Repeat";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LogoutIcon from "@mui/icons-material/Logout";
import StorefrontIcon from "@mui/icons-material/Storefront";
import NotificationBell from "../notifications/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { useEmployeeNotificationSounds } from "../../hooks/useEmployeeNotificationSounds";
import { useTaskEventSource } from "../../hooks/useTaskEventSource";
import { he } from "../../i18n/he";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import {
  sidebarHeaderSx,
  sidebarNavButtonSx,
  sidebarNavIconSx,
  sidebarNavTextSx,
} from "../../styles/hebrewAlign";
import { isNativeApp } from "../../utils/isNativeApp";
import { shouldUseMainNavOverlay } from "../../utils/mainNavOverlay";
import { shouldShowAppBack } from "../../utils/navigationBack";
import BackButton from "../ui/BackButton";
import ManagerBottomNav from "./ManagerBottomNav";
import ManagerNewTaskFab from "./ManagerNewTaskFab";
import { shouldShowManagerChrome } from "../../utils/managerBottomNav";

const SIDEBAR_BG = "#0B1220";
const SIDEBAR_ACCENT = "#1A9B86";

const drawerPaperSx = {
  boxSizing: "border-box" as const,
  width: SIDEBAR_WIDTH,
  height: "100vh",
  maxHeight: "100vh",
  overflow: "hidden",
  border: "none",
  bgcolor: SIDEBAR_BG,
  backgroundImage: `
    radial-gradient(ellipse 90% 50% at 0% 0%, ${alpha(SIDEBAR_ACCENT, 0.22)} 0%, transparent 55%),
    linear-gradient(180deg, #111827 0%, ${SIDEBAR_BG} 40%, #080D16 100%)
  `,
};

function OutletSuspense({ children }: { children?: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Box py={4}>
          <ListSkeleton variant="dashboard" />
        </Box>
      }
    >
      {children ?? <Outlet />}
    </Suspense>
  );
}

function Layout() {
  const { user, loading, logout } = useAuth();
  useTaskEventSource(Boolean(user) && !loading);
  const isEmployee = user?.role === "employee";
  useEmployeeNotificationSounds(Boolean(user) && !loading && isEmployee);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const overlayNav = shouldUseMainNavOverlay(isNativeApp());
  const showBack = shouldShowAppBack(location.pathname, user?.role);
  const showManagerChrome = shouldShowManagerChrome(user?.role);

  const closeMainNav = () => setMobileOpen(false);

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
        { text: he.managerFixedTasks, icon: <RepeatIcon />, path: "/admin/fixed-tasks" },
        { text: he.taskGallery, icon: <CollectionsBookmarkIcon />, path: "/admin/gallery" },
        { text: he.adminUsers, icon: <PeopleIcon />, path: "/admin/users" },
        { text: he.invitations, icon: <MailOutlineIcon />, path: "/admin/invitations" },
      ];
    }
    if (user.role === "network_manager" || user.role === "branch_manager") {
      const items = [
        { text: he.managerArea, icon: <DashboardIcon />, path: "/manager" },
      ];
      if (user.role === "network_manager") {
        items.push({ text: he.adminBranches, icon: <StoreIcon />, path: "/manager/branches" });
      }
      items.push(
        { text: he.managerEmployees, icon: <PeopleIcon />, path: "/manager/employees" },
        { text: he.adminDepartments, icon: <CategoryIcon />, path: "/manager/departments" },
        { text: he.adminProducts, icon: <InventoryIcon />, path: "/manager/products" },
        { text: he.managerTasks, icon: <TaskAltIcon />, path: "/manager/tasks" },
        { text: he.managerFixedTasks, icon: <RepeatIcon />, path: "/manager/fixed-tasks" },
        { text: he.taskGallery, icon: <CollectionsBookmarkIcon />, path: "/manager/gallery" },
        { text: he.managerIssues, icon: <ReportProblemIcon />, path: "/manager/issues" },
        { text: he.invitations, icon: <MailOutlineIcon />, path: "/manager/invitations" },
      );
      return items;
    }
    return [{ text: he.employeeArea, icon: <DashboardIcon />, path: "/employee" }];
  }, [user]);

  const handleLogout = () => {
    closeMainNav();
    void logout();
  };

  const handleNavigation = (path: string) => {
    closeMainNav();
    navigate(path);
  };

  const initials = (user?.full_name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: alpha("#fff", 0.92),
      }}
    >
      <Box sx={{ ...sidebarHeaderSx, borderBottomColor: alpha("#fff", 0.08) }}>
        <Box display="flex" alignItems="center" gap={1.25} mb={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(SIDEBAR_ACCENT, 0.2),
              color: SIDEBAR_ACCENT,
              border: `1px solid ${alpha(SIDEBAR_ACCENT, 0.35)}`,
            }}
          >
            <StorefrontIcon fontSize="small" />
          </Box>
          <Box minWidth={0}>
            <Typography variant="subtitle1" fontWeight={800} noWrap letterSpacing="-0.02em">
              {he.appName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.55, display: "block" }} noWrap>
              {he.appSubtitle}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            p: 1.25,
            borderRadius: 2.5,
            bgcolor: alpha("#fff", 0.05),
            border: `1px solid ${alpha("#fff", 0.07)}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: "0.8rem",
                fontWeight: 700,
                bgcolor: alpha(SIDEBAR_ACCENT, 0.25),
                color: "#E6FFFA",
              }}
            >
              {initials}
            </Avatar>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ opacity: 0.9 }}>
              {user?.full_name}
            </Typography>
          </Box>
          <NotificationBell />
        </Box>
      </Box>

      <Typography
        variant="overline"
        sx={{ px: 3, pt: 2.5, pb: 0.5, opacity: 0.4, fontSize: "0.65rem" }}
      >
        {he.mainMenu}
      </Typography>

      <List sx={{ flex: 1, px: 1.5, py: 0.5, overflowY: "auto" }}>
        {menuItems.map((item) => {
          const selected =
            item.path === "/manager" || item.path === "/admin" || item.path === "/employee"
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => handleNavigation(item.path)}
              sx={{
                ...sidebarNavButtonSx,
                borderRadius: 2.5,
                mb: 0.5,
                py: 1.1,
                color: selected ? "#fff" : alpha("#fff", 0.72),
                "&.Mui-selected": {
                  bgcolor: alpha(SIDEBAR_ACCENT, 0.22),
                  boxShadow: `inset 3px 0 0 ${SIDEBAR_ACCENT}`,
                  "&:hover": { bgcolor: alpha(SIDEBAR_ACCENT, 0.28) },
                },
                "&:hover": { bgcolor: alpha("#fff", 0.06), color: "#fff" },
              }}
            >
              <ListItemIcon
                sx={{
                  ...sidebarNavIconSx,
                  color: selected ? SIDEBAR_ACCENT : "inherit",
                  opacity: selected ? 1 : 0.85,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                slotProps={{
                  primary: {
                    sx: {
                      ...sidebarNavTextSx,
                      fontWeight: selected ? 700 : 500,
                      fontSize: "0.925rem",
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: `1px solid ${alpha("#fff", 0.08)}` }}>
        <Button
          fullWidth
          type="button"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: alpha("#fff", 0.75),
            borderRadius: 2.5,
            py: 1.1,
            border: `1px solid ${alpha("#fff", 0.08)}`,
            bgcolor: alpha("#fff", 0.03),
            "&:hover": {
              bgcolor: alpha("#fff", 0.08),
              color: "#fff",
            },
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
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: { xs: 2, sm: 2.5 },
            py: 1.25,
            color: "#fff",
            bgcolor: SIDEBAR_BG,
            backgroundImage: `
              radial-gradient(ellipse 80% 120% at 100% 0%, ${alpha(SIDEBAR_ACCENT, 0.28)} 0%, transparent 50%),
              linear-gradient(90deg, #111827 0%, ${SIDEBAR_BG} 100%)
            `,
            borderBottom: `1px solid ${alpha("#fff", 0.06)}`,
            boxShadow: `0 8px 24px ${alpha("#0B1220", 0.25)}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.25}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: alpha(SIDEBAR_ACCENT, 0.2),
                color: SIDEBAR_ACCENT,
              }}
            >
              <StorefrontIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                {he.appName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.55, display: { xs: "none", sm: "block" } }}>
                {user?.full_name}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <NotificationBell />
            <Button
              type="button"
              color="inherit"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                ...sidebarNavButtonSx,
                opacity: 0.85,
                borderRadius: 2,
                px: 1.5,
                "&:hover": { opacity: 1, bgcolor: alpha("#fff", 0.08) },
              }}
            >
              {he.logout}
            </Button>
          </Box>
        </Box>
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: { xs: 2, sm: 2.5 }, maxWidth: 960, mx: "auto" }}>
          {showBack && <BackButton />}
          <OutletSuspense />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
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
          // Natif / mobile : FAB toujours ; desktop web : seulement xs
          display: overlayNav ? "inline-flex" : { xs: "inline-flex", sm: "none" },
          // Force paint WebView (sinon le FAB n’apparaît qu’après un tap)
          transform: "translateZ(0)",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <MenuIcon />
      </Fab>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={closeMainNav}
        ModalProps={{ keepMounted: false }}
        sx={{
          display: overlayNav ? "block" : { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { ...drawerPaperSx, position: "fixed" },
        }}
      >
        {drawerContent}
      </Drawer>

      {!overlayNav && (
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
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          order: 1,
          height: "100%",
          minHeight: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          px: { xs: 1.5, sm: 3, md: 4 },
          py: { xs: 2.5, sm: 3.5 },
          pb: showManagerChrome
            ? overlayNav
              ? 14
              : { xs: 14, sm: 3.5 }
            : { xs: 10, sm: 3.5 },
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
          {showBack && <BackButton />}
          <OutletSuspense />
        </Box>
      </Box>

      {showManagerChrome && (
        <>
          <ManagerNewTaskFab forceVisible={overlayNav} />
          <ManagerBottomNav forceVisible={overlayNav} />
        </>
      )}
    </Box>
  );
}

export default Layout;
