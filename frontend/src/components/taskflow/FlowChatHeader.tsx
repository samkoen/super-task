import { Box, ButtonBase, Typography } from "@mui/material";
import backIcon from "../../assets/flow1/icon-arrow-left.svg";
import { he } from "../../i18n/he";
import { flowColor, flowText } from "../../styles/flowTokens";
import { withSystemTopInsetCss } from "../../utils/systemInsets";

type HeaderProps = {
  /** Titre de la sous-tâche (« סרטון בסטה »). */
  title: string;
  /** Titre de la tâche (« פתיחת משמרת ») : début du sous-titre. */
  taskTitle?: string;
  managerName?: string | null;
  onBack: () => void;
};

/** En-tête du chat (écran 12ב) : « צ׳אט • סרטון בסטה », « פתיחת משמרת • רונית, מנהלת משמרת », retour rond à gauche. */
export function FlowChatHeader({ title, taskTitle, managerName, onBack }: HeaderProps) {
  return (
    <Box
      data-testid="flow-chat-header"
      sx={{ display: "flex", alignItems: "center", gap: "16px", px: "24px", pt: withSystemTopInsetCss("24px"), pb: "24px", bgcolor: flowColor.alphaNeutral0_70 }}
    >
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
        <Typography component="h1" data-testid="flow-chat-title" noWrap sx={{ ...flowText.h1, color: flowColor.neutral900 }}>
          {he.flowChatHeaderTitle(title)}
        </Typography>
        <Typography data-testid="flow-chat-subtitle" noWrap sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66 }}>
          {he.flowChatHeaderSub(managerName, taskTitle)}
        </Typography>
      </Box>
      <ButtonBase
        aria-label={he.flowBack}
        data-testid="flow-chat-back"
        onClick={onBack}
        sx={{ flexShrink: 0, width: 56, height: 56, borderRadius: "50%", bgcolor: flowColor.neutral100 }}
      >
        <Box component="img" src={backIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}
