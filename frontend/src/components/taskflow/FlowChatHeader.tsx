import { Box, ButtonBase, Typography } from "@mui/material";
import backIcon from "../../assets/flow1/chat-back.svg";
import { he } from "../../i18n/he";
import { flowColor, flowText } from "../../styles/flowTokens";

type HeaderProps = {
  title: string;
  managerName?: string | null;
  onBack: () => void;
};

/** En-tête du chat (écran 12) : retour rond à droite, « צ׳אט • titre » et « מנהלת · מנהלת משמרת ». */
export function FlowChatHeader({ title, managerName, onBack }: HeaderProps) {
  return (
    <Box
      data-testid="flow-chat-header"
      sx={{ display: "flex", alignItems: "center", gap: "16px", px: "24px", pt: "calc(24px + env(safe-area-inset-top, 0px))", pb: "24px", bgcolor: flowColor.alphaNeutral0_70 }}
    >
      <ButtonBase
        aria-label={he.flowBack}
        data-testid="flow-chat-back"
        onClick={onBack}
        sx={{ flexShrink: 0, width: 56, height: 56, borderRadius: "50%", bgcolor: flowColor.neutral100 }}
      >
        <Box component="img" src={backIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
      </ButtonBase>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
        <Typography component="h1" data-testid="flow-chat-title" noWrap sx={{ ...flowText.h1, color: flowColor.neutral900 }}>
          {he.flowChatHeaderTitle(title)}
        </Typography>
        <Typography data-testid="flow-chat-subtitle" noWrap sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66 }}>
          {he.flowChatHeaderSub(managerName)}
        </Typography>
      </Box>
    </Box>
  );
}
