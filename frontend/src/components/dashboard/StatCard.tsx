import { Box, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  accent?: string;
}

export default function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        borderTop: accent ? `4px solid ${accent}` : undefined,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ opacity: 0.85, fontSize: 28, lineHeight: 1 }}>{icon}</Box>
        )}
      </Box>
    </Paper>
  );
}
