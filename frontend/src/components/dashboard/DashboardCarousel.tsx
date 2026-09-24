import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface DashboardCarouselProps {
  title: string;
  count: number;
  emptyLabel: string;
  children: ReactNode;
  showHeading?: boolean;
}

/** Conteneur section + scroll horizontal pour cartes dashboard. */
export default function DashboardCarousel({
  title,
  count,
  emptyLabel,
  children,
  showHeading = true,
}: DashboardCarouselProps) {
  return (
    <Box mb={showHeading ? 3 : 1}>
      {showHeading ? (
        <Box display="flex" alignItems="baseline" gap={1} mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({count})
          </Typography>
        </Box>
      ) : null}
      {count === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            overflowX: "auto",
            pb: 1,
            mx: -0.5,
            px: 0.5,
            scrollSnapType: "x mandatory",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "action.disabled",
              borderRadius: 3,
            },
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
