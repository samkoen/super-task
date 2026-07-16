import type { ReactNode } from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        px: 2,
        py: compact ? 4 : 6,
        borderRadius: 3,
        border: "1px dashed",
        borderColor: "divider",
        bgcolor: (t) => alpha(t.palette.text.primary, 0.015),
      }}
    >
      <Box
        sx={{
          width: compact ? 48 : 56,
          height: compact ? 48 : 56,
          borderRadius: 2.5,
          display: "grid",
          placeItems: "center",
          mb: 1.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
          color: "primary.main",
          fontSize: compact ? 24 : 28,
        }}
      >
        {icon ?? <InboxOutlinedIcon fontSize="inherit" />}
      </Box>
      <Typography variant={compact ? "subtitle1" : "h6"} fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mb: actionLabel ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: description ? 0 : 1.5 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
