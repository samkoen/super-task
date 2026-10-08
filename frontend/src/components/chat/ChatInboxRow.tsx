import type { ReactNode } from "react";
import { Box, ListItemButton, ListItemText } from "@mui/material";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_INK, employeeCardSx } from "../../styles/employeeUi";
import { ChatRowTrailing } from "./EmployeeChatRowItem";

/** Ligne de la boîte de discussions : même carte que côté oved, avec les non-lus en évidence. */
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
  const unread = unreadCount > 0;
  return (
    <ListItemButton
      onClick={onClick}
      data-unread={unread ? "true" : "false"}
      sx={{
        ...employeeCardSx,
        minHeight: 84,
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        ...(unread ? { borderInlineStart: `5px solid ${EMPLOYEE_BRAND}` } : {}),
      }}
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
        secondary={preview || he.chatRowEmpty}
        primaryTypographyProps={{
          component: "div",
          fontWeight: unread ? 800 : 700,
          fontSize: "1.1rem",
          color: EMPLOYEE_INK,
        }}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: "1rem",
          color: unread ? "text.primary" : "text.secondary",
          fontWeight: unread ? 700 : 400,
        }}
      />
      <ChatRowTrailing time={lastAt} unread={unreadCount} />
    </ListItemButton>
  );
}
