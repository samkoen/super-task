import type { ReactNode } from "react";
import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../../styles/flowTokens";
import { MANAGER_RAIL_ORDER, MANAGER_RAIL_WIDTH_PX, type ManagerTab } from "../../../utils/managerShell";
import { systemTopInsetCss } from "../../../utils/systemInsets";

const ICONS: Record<ManagerTab, ReactNode> = {
  home: <HomeOutlinedIcon />,
  tasks: <DescriptionOutlinedIcon />,
  team: <GroupsOutlinedIcon />,
  chats: <ChatBubbleOutlineRoundedIcon />,
};

type Props = {
  active: ManagerTab | null;
  chatUnread: number;
  name?: string | null;
  photoUrl?: string | null;
  onSelect: (tab: ManagerTab) => void;
  onOpenMore: () => void;
};

function RailTab({ tab, selected, unread, onSelect }: { tab: ManagerTab; selected: boolean; unread: number; onSelect: (tab: ManagerTab) => void }) {
  return (
    <ButtonBase
      aria-current={selected ? "page" : undefined}
      data-testid={`manager-rail-${tab}`}
      onClick={() => onSelect(tab)}
      sx={{
        position: "relative",
        width: 80,
        py: "10px",
        flexDirection: "column",
        gap: "4px",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: selected ? flowColor.neutral900 : "transparent",
        color: selected ? flowColor.neutral0 : flowColor.neutral900,
      }}
    >
      {ICONS[tab]}
      <Typography sx={{ ...flowText.label, color: "inherit" }}>{he.managerTabLabels[tab]}</Typography>
      {tab === "chats" && unread > 0 ? (
        <Box data-testid="manager-rail-unread" aria-label={he.managerChatUnread(unread)} sx={{ position: "absolute", top: 8, right: 22, width: 7, height: 7, borderRadius: "50%", bgcolor: flowColor.orange500 }} />
      ) : null}
    </ButtonBase>
  );
}

/** Avatar en bas du rail : ouvre « עוד » (profil, דוחות, הגדרות…), comme l'avatar de l'en-tête sur mobile. */
function RailAvatar({ name, photoUrl, onClick }: { name?: string | null; photoUrl?: string | null; onClick: () => void }) {
  const media = useResolvedMediaSrc(photoUrl || null, false);
  return (
    <ButtonBase aria-label={he.managerOpenMore} data-testid="manager-rail-more" onClick={onClick} sx={{ borderRadius: "50%" }}>
      <Avatar src={media.src ?? undefined} alt={name || ""} sx={{ width: flowSize.avatar, height: flowSize.avatar, bgcolor: flowColor.neutral300, color: flowColor.neutral900 }}>
        {(name || "").trim().charAt(0)}
      </Avatar>
    </ButtonBase>
  );
}

/**
 * Version ordinateur (étape 8) : rail vertical clair dans le style FLOW, collé au bord de début
 * (droite en RTL), à la place de la pilule du bas. Mêmes 4 onglets, l'avatar en bas.
 */
export default function ManagerSideRail({ active, chatUnread, name, photoUrl, onSelect, onOpenMore }: Props) {
  return (
    <Box
      component="nav"
      aria-label={he.managerShellNavLabel}
      data-testid="manager-side-rail"
      sx={{
        position: "fixed",
        top: 0,
        bottom: 0,
        right: 0,
        width: MANAGER_RAIL_WIDTH_PX,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        pt: `calc(24px + ${systemTopInsetCss()})`,
        pb: "24px",
        bgcolor: "rgba(255,255,255,0.72)",
        borderLeft: `1px solid ${flowColor.line}`,
        zIndex: (t) => t.zIndex.appBar + 1,
      }}
    >
      {MANAGER_RAIL_ORDER.map((tab) => (
        <RailTab key={tab} tab={tab} selected={active === tab} unread={chatUnread} onSelect={onSelect} />
      ))}
      <Box sx={{ flex: 1 }} />
      <RailAvatar name={name} photoUrl={photoUrl} onClick={onOpenMore} />
    </Box>
  );
}
