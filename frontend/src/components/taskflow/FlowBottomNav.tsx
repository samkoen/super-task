import { Box, ButtonBase } from "@mui/material";
import navChatIcon from "../../assets/flow1/nav-chat.svg";
import navDocsIcon from "../../assets/flow1/nav-docs.svg";
import navHomeIcon from "../../assets/flow1/nav-home.svg";
import navTeamIcon from "../../assets/flow1/nav-team.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius } from "../../styles/flowTokens";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";

type Props = {
  /** Onglet actif « בית » : revient à l'écran des tâches. */
  onHome: () => void;
  onChat: () => void;
  /** Sans destination, l'icône reste affichée mais n'est pas cliquable. */
  onDocs?: () => void;
  onTeam?: () => void;
};

type TabProps = { label: string; testId: string; icon: string; onClick?: () => void };

const TAB = 41.032;
const ICON = 17.097;

/** Pastille 41 de la barre : icône 17 neutral/300 centrée (Figma « Tab · … »). */
function NavTab({ label, testId, icon, onClick }: TabProps) {
  return (
    <ButtonBase
      aria-label={label}
      data-testid={testId}
      disabled={!onClick}
      onClick={onClick}
      sx={{ width: TAB, height: TAB, flexShrink: 0, borderRadius: `${flowRadius.full}px`, "&.Mui-disabled": { pointerEvents: "none" } }}
    >
      <Box component="img" src={icon} alt="" sx={{ width: ICON, height: ICON, display: "block" }} />
    </ButtonBase>
  );
}

/** « Tab · משימות » (actif) : le SVG du Figma contient déjà le disque blanc et l'icône maison. */
function ActiveTab({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={he.flowNavHome}
      aria-current="page"
      data-testid="flow-nav-home"
      onClick={onClick}
      sx={{ width: TAB, height: TAB, flexShrink: 0, borderRadius: `${flowRadius.full}px` }}
    >
      <Box component="img" src={navHomeIcon} alt="" sx={{ width: TAB, height: TAB, display: "block" }} />
    </ButtonBase>
  );
}

/**
 * Barre du bas du FLOW 1 (Figma « Bottom Nav », écrans 02 à 05 et 09) : pastille sombre
 * avec מסמכים · צוות · צ'אט · בית (actif), posée à 18 px du bas de l'écran.
 */
export default function FlowBottomNav({ onHome, onChat, onDocs, onTeam }: Props) {
  return (
    <Box
      component="nav"
      aria-label={he.flowNavLabel}
      data-testid="flow-bottom-nav"
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: withSystemBottomInsetCss("18px"),
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <Box
        sx={{
          direction: "ltr",
          pointerEvents: "auto",
          display: "flex",
          gap: "5.129px",
          p: "5.129px",
          boxSizing: "border-box",
          borderRadius: `${flowRadius.full}px`,
          bgcolor: flowColor.neutral900,
          border: `0.855px solid ${flowColor.neutral900}`,
          backdropFilter: "blur(8.548px)",
          boxShadow: "0px 6.839px 13.677px rgba(14,20,48,0.06)",
        }}
      >
        <NavTab label={he.flowNavDocs} testId="flow-nav-docs" icon={navDocsIcon} onClick={onDocs} />
        <NavTab label={he.flowNavTeam} testId="flow-nav-team" icon={navTeamIcon} onClick={onTeam} />
        <NavTab label={he.flowNavChat} testId="flow-nav-chat" icon={navChatIcon} onClick={onChat} />
        <ActiveTab onClick={onHome} />
      </Box>
    </Box>
  );
}

/** Espace à garder sous la pile pour que la barre flottante ne cache pas la dernière carte. */
export const flowBottomNavClearanceCss = (): string => withSystemBottomInsetCss(`${53 + 18 + 24}px`);
