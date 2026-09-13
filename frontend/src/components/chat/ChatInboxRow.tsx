import type { ReactNode } from "react";
import { Badge, Box, ListItemButton, ListItemText, Typography } from "@mui/material";
import { formatTime } from "../../utils/dashboardTime";

export default function ChatInboxRow({
  title,
  preview,
  lastAt,
  unreadCount,
  onClick,
  leading,
  titleExtra,
}: {
  title: string;
  preview: string;
  lastAt: string | null;
  unreadCount: number;
  onClick: () => void;
  leading?: ReactNode;
  titleExtra?: ReactNode;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.25 }}
    >
      {leading}
      <ListItemText
        primary={
          titleExtra ? (
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <span>{title}</span>
              {titleExtra}
            </Box>
          ) : (
            title
          )
        }
        secondary={preview}
        primaryTypographyProps={{ fontWeight: unreadCount ? 800 : 600, component: "div" }}
        secondaryTypographyProps={{ noWrap: true }}
      />
      <Box textAlign="left" minWidth={56}>
        {lastAt && (
          <Typography variant="caption" color="text.secondary" display="block">
            {formatTime(lastAt)}
          </Typography>
        )}
        {unreadCount > 0 && <Badge badgeContent={unreadCount} color="error" sx={{ mt: 0.5 }} />}
      </Box>
    </ListItemButton>
  );
}
