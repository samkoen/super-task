import type { ReactNode } from "react";
import { alpha, Box, Card, CardContent, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { he } from "../../i18n/he";

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
};

export default function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <Box dir="rtl" sx={{ minHeight: "100vh", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          p: 6,
          color: "#fff",
          background: "linear-gradient(135deg, #065A4D 0%, #0B7B6A 50%, #14A892 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <StorefrontIcon sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight={800}>
            {he.appName}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {he.appSubtitle}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: { xs: "1", md: "0 0 440px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4 },
          bgcolor: "background.default",
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 400,
            border: `1px solid ${alpha("#1A2332", 0.08)}`,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="overline" color="primary" fontWeight={700}>
              {he.appName}
            </Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
