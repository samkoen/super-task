import { Box } from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import type { ChatVisualKind } from "../../../services/taskService";
import { chatUi, chatVisualColors } from "../../../styles/employeeChatUi";
import EmployeeAvatar from "../../employee/EmployeeAvatar";

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

/**
 * Chat Row Role=Manager (Figma) : avatar de la personne + pastille de la couleur du type
 * de tâche pour un fil de tâche ; sans pastille pour un chat direct.
 */
export function ChatPersonAvatar({
  name,
  photoUrl,
  kind,
}: {
  name: string;
  photoUrl: string | null;
  kind?: ChatVisualKind;
}) {
  const color = kind ? chatVisualColors[kind] ?? chatVisualColors.physical : null;
  const Icon = kind ? ICONS[kind] ?? ICONS.physical : null;
  return (
    <Box sx={{ position: "relative", flexShrink: 0, width: chatUi.avatar, height: chatUi.avatar }}>
      <EmployeeAvatar name={name} photoUrl={photoUrl} size={chatUi.avatar} />
      {color && Icon ? (
        <Box
          data-visual-kind={kind}
          sx={{
            position: "absolute",
            bottom: -2,
            insetInlineStart: -2,
            zIndex: 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid #fff",
            bgcolor: color.bg,
            color: color.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ fontSize: 12 }} />
        </Box>
      ) : null}
    </Box>
  );
}
