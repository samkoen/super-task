import type { ReactNode } from "react";
import { alpha, Box, Card, CardContent, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import GroupsIcon from "@mui/icons-material/Groups";
import SpeedIcon from "@mui/icons-material/Speed";
import { he } from "../../i18n/he";

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
};

const highlights = [
  { icon: <TaskAltIcon fontSize="small" />, label: he.managerTasks },
  { icon: <GroupsIcon fontSize="small" />, label: he.managerEmployees },
  { icon: <SpeedIcon fontSize="small" />, label: he.managerArea },
];

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
      <Box
        sx={{
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
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
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
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: alpha("#1A9B86", 0.25),
                color: "#5EEAD4",
              }}
            >
              <StorefrontIcon />
            </Box>
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

      <Box
        sx={{
          flex: { xs: "1", md: "0 0 480px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2.5, sm: 4 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1,
            mb: 2,
            width: "100%",
            maxWidth: 420,
            position: "absolute",
            top: 20,
            px: 2.5,
          }}
        >
          <StorefrontIcon color="primary" />
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {he.appName}
          </Typography>
        </Box>
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            mt: { xs: 5, md: 0 },
            border: `1px solid ${alpha("#0F172A", 0.07)}`,
            boxShadow: `0 4px 6px ${alpha("#0F172A", 0.03)}, 0 20px 48px ${alpha("#0F172A", 0.08)}`,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="overline" color="primary" fontWeight={700}>
              {he.appName}
            </Typography>
            <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: "-0.02em" }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {he.authFormHint}
            </Typography>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
