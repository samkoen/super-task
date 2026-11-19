import type { ReactNode } from "react";
import { Box, ButtonBase } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import { he } from "../../../i18n/he";
import type { ChatStatusKind } from "../../../services/taskService";
import { chatStatusColor, chatUi } from "../../../styles/employeeChatUi";
import { formatTime } from "../../../utils/dashboardTime";

const STATUS_LABEL: Record<ChatStatusKind, string> = {
  retake: he.employeeChatStatusRetake,
  pending_review: he.employeeChatStatusPending,
  awaiting_upload: he.employeeChatStatusUpload,
  approved: he.employeeChatStatusApproved,
};

const STATUS_ICON: Record<ChatStatusKind, typeof WarningAmberRoundedIcon> = {
  retake: WarningAmberRoundedIcon,
  pending_review: HourglassEmptyRoundedIcon,
  awaiting_upload: ScheduleRoundedIcon,
  approved: CheckCircleOutlineRoundedIcon,
};

/** Chat Status Tag Figma : « · » + libellé coloré + icône 14px, en tête de la ligne d'aperçu. */
export function ChatStatusTag({ status }: { status: ChatStatusKind }) {
  const Icon = STATUS_ICON[status];
  const color = chatStatusColor[status];
  return (
    <Box
      data-chat-status={status}
      sx={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, fontFamily: chatUi.font }}
    >
      <Icon sx={{ fontSize: 14, color }} />
      <Box component="span" sx={{ fontSize: 12, fontWeight: status === "awaiting_upload" ? 500 : 600, color }}>
        {STATUS_LABEL[status]}
      </Box>
      <Box component="span" sx={{ fontSize: 13, color: chatUi.textSecondary }}>
        ·
      </Box>
    </Box>
  );
}

const ellipsisSx = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } as const;

/**
 * Chat Row Figma (style WhatsApp) : avatar 52 à droite, titre + aperçu, heure et
 * indicateurs (badge non-lus / punaise) à gauche. Non lu = heure orange + badge compteur.
 */
export default function ChatListRow({
  avatar,
  title,
  preview,
  time,
  unread = 0,
  pinned = false,
  status = null,
  lastMine = false,
  onClick,
  testId,
}: {
  avatar: ReactNode;
  title: string;
  preview: string;
  time?: string | null;
  unread?: number;
  pinned?: boolean;
  status?: ChatStatusKind | null;
  lastMine?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  const hasUnread = unread > 0;
  return (
    <ButtonBase
      onClick={onClick}
      data-testid={testId}
      data-unread={hasUnread ? "true" : "false"}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: `${chatUi.rowGap}px`,
        px: 2,
        py: 1.5,
        borderRadius: "16px",
        textAlign: "start",
        fontFamily: chatUi.font,
        "&:hover": { bgcolor: "rgba(17,21,29,0.03)" },
      }}
    >
      {avatar}
      <ChatRowContent title={title} preview={preview} status={status} lastMine={lastMine} unread={hasUnread} />
      <ChatRowMeta time={time} unread={unread} pinned={pinned} />
    </ButtonBase>
  );
}

function ChatRowContent({
  title,
  preview,
  status,
  lastMine,
  unread,
}: {
  title: string;
  preview: string;
  status: ChatStatusKind | null;
  lastMine: boolean;
  unread: boolean;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
      <Box
        component="span"
        dir="auto"
        sx={{ ...ellipsisSx, fontSize: 15, fontWeight: 600, color: chatUi.textPrimary, lineHeight: "21px" }}
      >
        {title}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
        {status ? <ChatStatusTag status={status} /> : null}
        {lastMine && !status ? (
          <DoneAllRoundedIcon sx={{ fontSize: 14, color: chatUi.textSecondary, flexShrink: 0 }} />
        ) : null}
        <Box
          component="span"
          dir="auto"
          sx={{
            ...ellipsisSx,
            flex: 1,
            fontSize: 14,
            lineHeight: "19px",
            color: unread ? chatUi.textPrimary : chatUi.textSecondary,
            fontWeight: unread ? 500 : 400,
          }}
        >
          {preview}
        </Box>
      </Box>
    </Box>
  );
}

/** Colonne gauche : heure (orange si non lu) puis badge compteur ou punaise. */
function ChatRowMeta({ time, unread, pinned }: { time?: string | null; unread: number; pinned: boolean }) {
  const hasUnread = unread > 0;
  return (
    <Box
      sx={{
        alignSelf: "flex-start",
        pt: "2px",
        minHeight: 44,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        flexShrink: 0,
      }}
    >
      <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: hasUnread ? chatUi.textWarning : chatUi.textSecondary }}>
        {time ? formatTime(time) : " "}
      </Box>
      {hasUnread ? (
        <Box component="span" aria-label={String(unread)} sx={unreadBadgeSx}>
          {unread > 99 ? "99+" : unread}
        </Box>
      ) : pinned ? (
        <PushPinOutlinedIcon aria-label={he.employeeChatPinned} sx={{ fontSize: 16, color: chatUi.textSecondary }} />
      ) : null}
    </Box>
  );
}

const unreadBadgeSx = {
  minWidth: 20,
  height: 20,
  px: "6px",
  borderRadius: "999px",
  bgcolor: chatUi.accent,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;
