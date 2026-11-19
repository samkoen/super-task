import { Box } from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import type { ChatVisualKind } from "../../../services/taskService";
import { chatUi, chatVisualColors } from "../../../styles/employeeChatUi";

const ICONS: Record<ChatVisualKind, typeof VideocamOutlinedIcon> = {
  video: VideocamOutlinedIcon,
  photo: PhotoCameraOutlinedIcon,
  physical: Inventory2OutlinedIcon,
  check: AssignmentTurnedInOutlinedIcon,
  cleaning: AutoAwesomeOutlinedIcon,
};

const circleSx = {
  width: chatUi.avatar,
  height: chatUi.avatar,
  borderRadius: "50%",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

/** Task Avatar Figma : icône de la תת-משימה sur fond de la couleur du type. */
export function ChatTaskAvatar({ kind }: { kind: ChatVisualKind }) {
  const Icon = ICONS[kind] ?? ICONS.physical;
  const color = chatVisualColors[kind] ?? chatVisualColors.physical;
  return (
    <Box data-visual-kind={kind} sx={{ ...circleSx, bgcolor: color.bg, color: color.fg }}>
      <Icon sx={{ fontSize: 20 }} />
    </Box>
  );
}

/** Avatar noir du chat général (initiales de la menahelet). */
export function ChatGeneralAvatar({ initials }: { initials: string }) {
  return (
    <Box sx={{ ...circleSx, bgcolor: chatUi.generalAvatarBg, color: "#fff" }}>
      {initials ? (
        <Box component="span" sx={{ fontFamily: chatUi.font, fontWeight: 500, fontSize: 13 }}>
          {initials}
        </Box>
      ) : (
        <ChatOutlinedIcon sx={{ fontSize: 20 }} />
      )}
    </Box>
  );
}
