import type { ReactNode } from "react";
import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
import NotificationBell from "../notifications/NotificationBell";
import arrowLeftIcon from "../../assets/flow1/icon-arrow-left.svg";
import bellIcon from "../../assets/flow1/icon-bell.svg";
import messageIcon from "../../assets/flow1/icon-message-circle.svg";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import { flowColor, flowSize, flowText } from "../../styles/flowTokens";
import { formatDueHour, greetingFor } from "../../utils/flowStack";

type Props = {
  title: string;
  dueAt?: string | null;
  employeeName?: string | null;
  photoUrl?: string | null;
  onBack: () => void;
  /** Icône du haut : mène à la liste des chats de tâches. */
  onOpenChats: () => void;
};

type RoundButtonProps = {
  label: string;
  testId: string;
  icon: string;
  iconSize: number;
  onClick: () => void;
  children?: ReactNode;
};

/** Bouton rond 56 (Figma « Round Button ») : fond blanc, icône neutral/600 de 2 px. */
function RoundButton({ label, testId, icon, iconSize, onClick, children }: RoundButtonProps) {
  return (
    <ButtonBase
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      sx={{ position: "relative", flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
    >
      <Box component="img" src={icon} alt="" sx={{ width: iconSize, height: iconSize, display: "block" }} />
      {children}
    </ButtonBase>
  );
}

/** Point orange « nouvelle notification » (7 px) posé en haut à droite de la cloche. */
function BadgeDot() {
  return (
    <Box
      data-testid="task-flow-bell-dot"
      sx={{ position: "absolute", left: 32.5, top: 17, width: 7, height: 7, borderRadius: "50%", bgcolor: flowColor.orange500 }}
    />
  );
}

function Greeting({ name, photoUrl }: { name?: string | null; photoUrl?: string | null }) {
  const media = useResolvedMediaSrc(photoUrl || null, false);
  const initial = (name || "").trim().charAt(0);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "11px", height: flowSize.avatar }}>
      <Avatar
        data-testid="task-flow-avatar"
        src={media.src ?? undefined}
        alt={name || ""}
        sx={{ width: flowSize.avatar, height: flowSize.avatar, bgcolor: flowColor.neutral300, color: flowColor.neutral900, fontFamily: flowText.body.fontFamily }}
      >
        {initial}
      </Avatar>
      <Typography data-testid="task-flow-greeting" sx={{ ...flowText.bodyLarge, color: flowColor.alphaNeutral1000_53, whiteSpace: "nowrap" }}>
        {greetingFor(name)}
      </Typography>
    </Box>
  );
}

function TitleBlock({ title, due }: { title: string; due: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h1" data-testid="task-flow-title" sx={{ ...flowText.h1, color: flowColor.neutral900, overflowWrap: "anywhere" }}>
        {title}
      </Typography>
      {due ? (
        <Typography data-testid="task-flow-due" sx={{ ...flowText.bodyLarge, color: flowColor.navy800 }}>
          {he.flowDueAtHour(due)}
        </Typography>
      ) : null}
    </Box>
  );
}

function Toolbar({ onBack, onOpenChats }: Pick<Props, "onBack" | "onOpenChats">) {
  return (
    <Box sx={{ direction: "ltr", display: "flex", alignItems: "center", justifyContent: "space-between", pt: "16px", pb: "12px" }}>
      <RoundButton label={he.flowBack} testId="task-flow-back" icon={arrowLeftIcon} iconSize={22} onClick={onBack} />
      <Box sx={{ display: "flex", gap: "12px" }}>
        <RoundButton label={he.flowOpenChats} testId="task-flow-chats" icon={messageIcon} iconSize={19} onClick={onOpenChats} />
        <NotificationBell
          renderTrigger={(open, unread) => (
            <RoundButton label={he.notificationsTitle} testId="task-flow-bell" icon={bellIcon} iconSize={22} onClick={open}>
              {unread > 0 ? <BadgeDot /> : null}
            </RoundButton>
          )}
        />
      </Box>
    </Box>
  );
}

/**
 * En-tête du FLOW 1 (Figma « Home Header » + « toolbar ») : avatar et salutation, titre de la tâche
 * avec « בשעה 6:30 », puis retour à gauche, chats et cloche à droite.
 */
export default function TaskFlowHeader({ title, dueAt, employeeName, photoUrl, onBack, onOpenChats }: Props) {
  return (
    <Box
      component="header"
      data-testid="task-flow-header"
      sx={{ px: `${flowSize.contentPaddingX}px`, pt: "calc(16px + env(safe-area-inset-top, 0px))" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
        <Greeting name={employeeName} photoUrl={photoUrl} />
        <TitleBlock title={title} due={formatDueHour(dueAt)} />
      </Box>
      <Toolbar onBack={onBack} onOpenChats={onOpenChats} />
    </Box>
  );
}
