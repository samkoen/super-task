import { Box, Grid2 as Grid, Skeleton, Stack } from "@mui/material";

export type ListSkeletonVariant = "cards" | "table" | "dashboard";

interface ListSkeletonProps {
  variant?: ListSkeletonVariant;
  rows?: number;
}

function CardSkeleton() {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <Skeleton variant="circular" width={46} height={46} />
        <Box flex={1}>
          <Skeleton width="70%" height={22} />
          <Skeleton width="45%" height={16} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
      <Skeleton width="40%" height={22} sx={{ mb: 1 }} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="85%" height={16} sx={{ mt: 0.5 }} />
    </Box>
  );
}

export default function ListSkeleton({ variant = "cards", rows = 6 }: ListSkeletonProps) {
  if (variant === "table") {
    return (
      <Box
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Skeleton variant="rectangular" height={44} sx={{ mb: 0 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Skeleton width={`${60 + (i % 3) * 10}%`} height={20} />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === "dashboard") {
    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: rows }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
          <CardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}
