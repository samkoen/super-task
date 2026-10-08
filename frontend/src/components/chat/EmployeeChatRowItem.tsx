import { Avatar, Badge, Box, ListItemButton, ListItemText, Typography } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { he } from "../../i18n/he";
import {
  EMPLOYEE_BRAND,
  EMPLOYEE_BRAND_GRADIENT,
  EMPLOYEE_INK,
  employeeCardSx,
} from "../../styles/employeeUi";
import { formatTime } from "../../utils/dashboardTime";
import type { EmployeeChatRow } from "../../utils/employeeTaskChats";

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

/** Une ligne de la liste des discussions : grande, lisible, avec les non-lus en évidence. */
export default function EmployeeChatRowItem({
  row,
  onRow,
}: {
  row: EmployeeChatRow;
  onRow: (row: EmployeeChatRow) => void;
}) {
  const general = row.kind === "general";
  const unread = general ? row.unread_count : 0;
  return (
    <ListItemButton
      onClick={() => onRow(row)}
      data-unread={unread > 0 ? "true" : "false"}
      sx={{
        ...employeeCardSx,
        minHeight: 84,
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        ...(unread > 0 ? { borderInlineStart: `5px solid ${EMPLOYEE_BRAND}` } : {}),
      }}
    >
      <ChatRowAvatar general={general} />
      <ListItemText
        primary={row.title}
        secondary={row.last_preview || he.chatRowEmpty}
        primaryTypographyProps={{ fontWeight: unread > 0 ? 800 : 700, fontSize: "1.1rem", color: EMPLOYEE_INK }}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: "1rem",
          color: unread > 0 ? "text.primary" : "text.secondary",
          fontWeight: unread > 0 ? 700 : 400,
        }}
      />
      <ChatRowTrailing time={row.last_at} unread={unread} />
    </ListItemButton>
  );
}

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
