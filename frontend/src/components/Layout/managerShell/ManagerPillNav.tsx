import { Box, ButtonBase } from "@mui/material";
import navChatIcon from "../../../assets/flow1/nav-chat.svg";
import navDocsIcon from "../../../assets/flow1/nav-docs.svg";
import navHomeIcon from "../../../assets/flow1/nav-home.svg";
import navTeamIcon from "../../../assets/flow1/nav-team.svg";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius } from "../../../styles/flowTokens";
import { MANAGER_PILL_OFFSET_PX } from "../../../utils/managerBottomNav";
import { MANAGER_TABS, type ManagerTab } from "../../../utils/managerShell";
import { withSystemBottomInsetCss } from "../../../utils/systemInsets";

const TAB = 41.032;
const ICON = 17.097;

const ICONS: Record<Exclude<ManagerTab, "home">, string> = {
  tasks: navDocsIcon,
  team: navTeamIcon,
  chats: navChatIcon,
};

type Props = {
  active: ManagerTab | null;
  chatUnread: number;
  onSelect: (tab: ManagerTab) => void;
};

/**
 * Icône d'un onglet. L'asset « בית » du Figma contient déjà le disque blanc : inversé, il devient
 * l'onglet éteint. Les autres icônes (traits clairs) sont assombries quand leur disque est blanc.
 */
function TabIcon({ tab, selected }: { tab: ManagerTab; selected: boolean }) {
  if (tab === "home") {
    return <Box component="img" src={navHomeIcon} alt="" sx={{ width: TAB, height: TAB, display: "block", filter: selected ? "none" : "invert(1)" }} />;
  }
  return (
    <Box component="img" src={ICONS[tab]} alt="" sx={{ width: ICON, height: ICON, display: "block", filter: selected ? "brightness(0.08)" : "none" }} />
  );
}

/** Point orange sur « שיחות » quand des messages attendent (même point que la cloche du FLOW). */
function UnreadDot({ count }: { count: number }) {
  return (
    <Box
      data-testid="manager-pill-unread"
      aria-label={he.managerChatUnread(count)}
      sx={{ position: "absolute", top: 7, right: 9, width: 7, height: 7, borderRadius: "50%", bgcolor: flowColor.orange500 }}
    />
  );
}

function PillTab({ tab, selected, unread, onSelect }: { tab: ManagerTab; selected: boolean; unread: number; onSelect: (tab: ManagerTab) => void }) {
  return (
    <ButtonBase
      aria-label={he.managerTabLabels[tab]}
      aria-current={selected ? "page" : undefined}
      data-testid={`manager-pill-${tab}`}
      onClick={() => onSelect(tab)}
      sx={{
        position: "relative",
        width: TAB,
        height: TAB,
        flexShrink: 0,
        borderRadius: `${flowRadius.full}px`,
        bgcolor: selected && tab !== "home" ? flowColor.neutral0 : "transparent",
      }}
    >
      <TabIcon tab={tab} selected={selected} />
      {tab === "chats" && unread > 0 ? <UnreadDot count={unread} /> : null}
    </ButtonBase>
  );
}

/**
 * Pilule du bas menahel, identique à celle de l'oved (Figma « Bottom Nav ») :
 * משימות · צוות · שיחות · בית, l'onglet actif dans un disque blanc.
 */
export default function ManagerPillNav({ active, chatUnread, onSelect }: Props) {
  return (
    <Box
      component="nav"
      aria-label={he.managerShellNavLabel}
      data-testid="manager-pill-nav"
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: withSystemBottomInsetCss(`${MANAGER_PILL_OFFSET_PX}px`),
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: (t) => t.zIndex.appBar + 1,
      }}
    >
      <Box
        sx={{
          direction: "ltr",
          pointerEvents: "auto",
          display: "flex",
          gap: "5.129px",
          p: "5.129px",
          borderRadius: `${flowRadius.full}px`,
          bgcolor: flowColor.neutral900,
          boxShadow: "0px 6.839px 13.677px rgba(14,20,48,0.06)",
        }}
      >
        {MANAGER_TABS.map(({ tab }) => (
          <PillTab key={tab} tab={tab} selected={active === tab} unread={chatUnread} onSelect={onSelect} />
        ))}
      </Box>
    </Box>
  );
}
