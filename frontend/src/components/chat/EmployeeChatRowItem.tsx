/** Avatar et colonne heure/non-lus partagés par les listes de chats manager. */
import { Avatar, Badge, Box, Typography } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  EMPLOYEE_BRAND,
  EMPLOYEE_BRAND_GRADIENT,
} from "../../styles/employeeUi";
import { formatTime } from "../../utils/dashboardTime";

export const unreadBadgeSx = {
  "& .MuiBadge-badge": {
    position: "static",
    transform: "none",
    minWidth: 28,
    height: 28,
    borderRadius: "14px",
    fontSize: "0.95rem",
    fontWeight: 800,
  },
} as const;

export function ChatRowAvatar({ general }: { general: boolean }) {
  return (
    <Avatar
      sx={{
        width: 56,
        height: 56,
        color: general ? "#fff" : EMPLOYEE_BRAND,
        background: general ? EMPLOYEE_BRAND_GRADIENT : "rgba(10,107,92,0.12)",
      }}
    >
      {general ? <ChatOutlinedIcon /> : <TaskAltIcon />}
    </Avatar>
  );
}

export function ChatRowTrailing({ time, unread }: { time: string | null; unread: number }) {
  return (
    <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
      <Box textAlign="end" minWidth={52} display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
        {time ? (
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {formatTime(time)}
          </Typography>
        ) : null}
        {unread > 0 ? (
          <Badge badgeContent={unread} max={99} color="error" sx={unreadBadgeSx} />
        ) : null}
      </Box>
      <ChevronLeftIcon sx={{ color: "text.disabled" }} />
    </Box>
  );
}
