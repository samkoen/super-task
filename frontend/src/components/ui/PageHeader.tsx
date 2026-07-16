import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** En-tête de page cohérent (titre + sous-titre + action). */
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: { xs: "stretch", sm: "flex-start" },
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
      }}
    >
      <Box minWidth={0} flex={1}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            mb: subtitle ? 0.5 : 0,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>{action}</Box>
      )}
    </Box>
  );
}
