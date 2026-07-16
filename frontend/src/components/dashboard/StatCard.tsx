import { Box, Paper, Typography, alpha } from "@mui/material";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  accent?: string;
}

export default function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
  const tone = accent ?? "#0A6B5C";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        transition: "box-shadow 0.2s, transform 0.15s, border-color 0.15s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: (t) => t.shadows[3],
          borderColor: alpha(tone, 0.28),
        },
        "&::before": {
          content: '""',
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: tone,
          borderRadius: "0 3px 3px 0",
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
        <Box minWidth={0}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 0.75, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} lineHeight={1.15} sx={{ letterSpacing: "-0.03em" }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: alpha(tone, 0.1),
              color: tone,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
