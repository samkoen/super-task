import type { ReactNode } from "react";
import { alpha, Box, Typography } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AppBrandMark from "./AppBrandMark";
import GroupsIcon from "@mui/icons-material/Groups";
import SpeedIcon from "@mui/icons-material/Speed";
import { he } from "../../i18n/he";
import { dialogActionsPbCss, systemTopInsetCss } from "../../utils/systemInsets";
import { EMPLOYEE_BRAND_GRADIENT, EMPLOYEE_INK } from "../../styles/employeeUi";

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
};

const highlights = [
  { icon: <TaskAltIcon fontSize="small" />, label: he.managerTasks },
  { icon: <GroupsIcon fontSize="small" />, label: he.managerEmployees },
  { icon: <SpeedIcon fontSize="small" />, label: he.managerArea },
];

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

const desktopPanelSx = {
  flex: 1,
  display: { xs: "none", md: "flex" },
  flexDirection: "column",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  p: { md: 6, lg: 8 },
  color: "#fff",
  bgcolor: "#0B1220",
  backgroundImage: `
    radial-gradient(ellipse 70% 60% at 20% 20%, ${alpha("#1A9B86", 0.35)} 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 90% 80%, ${alpha("#0A6B5C", 0.25)} 0%, transparent 50%),
    linear-gradient(160deg, #111827 0%, #0B1220 45%, #061018 100%)
  `,
} as const;

function DesktopPanel() {
  return (
    <Box sx={desktopPanelSx}>
      <Box sx={{ position: "absolute", inset: 0, opacity: 0.35, backgroundImage: DOT_PATTERN }} />
      <Box sx={{ position: "relative", maxWidth: 460 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1.5,
            mb: 4,
            px: 1.5,
            py: 1,
            borderRadius: 3,
            bgcolor: alpha("#fff", 0.06),
            border: `1px solid ${alpha("#fff", 0.1)}`,
          }}
        >
          <AppBrandMark size={42} />
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            {he.appName}
          </Typography>
        </Box>
        <Typography
          variant="h3"
          fontWeight={800}
          sx={{ mb: 2, fontSize: { md: "2.4rem", lg: "2.75rem" }, lineHeight: 1.15 }}
        >
          {he.appSubtitle}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7, mb: 4, maxWidth: 400, lineHeight: 1.7 }}>
          {he.authLayoutLead}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {highlights.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.5,
                py: 1.1,
                borderRadius: 2,
                bgcolor: alpha("#fff", 0.04),
                border: `1px solid ${alpha("#fff", 0.06)}`,
                width: "fit-content",
              }}
            >
              <Box sx={{ color: "#5EEAD4", display: "grid", placeItems: "center" }}>{item.icon}</Box>
              <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/** Bandeau de marque sur mobile : logo + nom, le formulaire remonte par-dessus. */
function MobileBrandBand() {
  return (
    <Box
      data-testid="auth-mobile-band"
      sx={{
        display: { xs: "flex", md: "none" },
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        background: EMPLOYEE_BRAND_GRADIENT,
        pt: `calc(${systemTopInsetCss()} + 36px)`,
        pb: 7,
        px: 3,
        "&::after": {
          content: '""',
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: "50%",
          insetInlineEnd: -80,
          top: -100,
          background: alpha("#fff", 0.08),
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: "26px",
          bgcolor: "#fff",
          boxShadow: `0 10px 28px ${alpha("#000", 0.25)}`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <AppBrandMark size={76} />
      </Box>
      <Typography variant="h4" component="p" fontWeight={900} sx={{ mt: 1 }}>
        {he.appName}
      </Typography>
      <Typography variant="body1" sx={{ color: alpha("#fff", 0.85), fontWeight: 600 }}>
        {he.appSubtitle}
      </Typography>
    </Box>
  );
}

const formPanelSx = {
  flex: { xs: "1", md: "0 0 480px" },
  display: "flex",
  flexDirection: "column",
  alignItems: { xs: "stretch", md: "center" },
  justifyContent: { xs: "flex-start", md: "center" },
  p: { xs: 0, md: 4 },
  position: "relative",
} as const;

const formCardSx = {
  width: "100%",
  maxWidth: { xs: "none", md: 420 },
  flex: { xs: 1, md: "0 0 auto" },
  mt: { xs: -3.5, md: 0 },
  position: "relative",
  bgcolor: "background.paper",
  borderRadius: { xs: "30px 30px 0 0", md: "20px" },
  border: { xs: "none", md: `1px solid ${alpha(EMPLOYEE_INK, 0.07)}` },
  boxShadow: {
    xs: `0 -10px 30px ${alpha(EMPLOYEE_INK, 0.12)}`,
    md: `0 4px 6px ${alpha(EMPLOYEE_INK, 0.03)}, 0 20px 48px ${alpha(EMPLOYEE_INK, 0.08)}`,
  },
  p: { xs: 3, sm: 4 },
  pb: { xs: dialogActionsPbCss(), md: 4 },
} as const;

export default function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        bgcolor: "background.default",
      }}
    >
      <DesktopPanel />
      <MobileBrandBand />
      <Box sx={formPanelSx}>
        <Box component="main" sx={formCardSx}>
          <Typography variant="h4" component="h1" fontWeight={900} sx={{ letterSpacing: "-0.02em" }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            {he.authFormHint}
          </Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
