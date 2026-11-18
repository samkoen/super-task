import { Box, ButtonBase, Typography } from "@mui/material";
import arrowLeftIcon from "../../assets/flow1/icon-arrow-left.svg";
import messageIcon from "../../assets/flow1/icon-message-circle.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../styles/flowTokens";

type Props = {
  title: string;
  titleColor?: string;
  /** « הושלמו N מתוך M » : le nombre de tirets suit le nombre de cartes de la tâche. */
  progress?: { done: number; total: number };
  onBack: () => void;
  backDisabled?: boolean;
  /** Icône de chat à droite du retour (caméra, écran 06) ; absente = pas d'icône. */
  onChat?: () => void;
  chatDisabled?: boolean;
};

function Dash({ done }: { done: boolean }) {
  return (
    <Box
      data-testid="flow-stepper-dash"
      data-done={done ? "true" : "false"}
      sx={{
        width: 18,
        height: 3.6,
        borderRadius: `${flowRadius.full}px`,
        bgcolor: done ? flowColor.navy800 : flowColor.alphaNavy800_18,
      }}
    />
  );
}

/** Figma « Progress Stepper » : le texte puis les tirets (le premier tiret est à droite). */
function Stepper({ done, total }: { done: number; total: number }) {
  return (
    <Box data-testid="flow-stepper" sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral1000_53, whiteSpace: "nowrap" }}>
        {he.flowStackCount(done, total)}
      </Typography>
      <Box sx={{ display: "flex", gap: "7.2px" }}>
        {Array.from({ length: total }, (_, index) => (
          <Dash key={index} done={index < done} />
        ))}
      </Box>
    </Box>
  );
}

/** Figma « Page Header » des écrans de tâche : titre (H1) à droite, retour rond à gauche, stepper dessous. */
export default function FlowPageHeader({ title, titleColor = flowColor.ink, progress, onBack, backDisabled, onChat, chatDisabled }: Props) {
  return (
    <Box data-testid="flow-page-header" sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 2 }}>
        <Typography component="h1" sx={{ ...flowText.h1, color: titleColor, overflowWrap: "anywhere" }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", gap: "12px", flexShrink: 0 }}>
          {onChat ? (
            <ButtonBase
              aria-label={he.flowCardMenuChat}
              data-testid="flow-page-chat"
              disabled={chatDisabled}
              onClick={onChat}
              sx={{ flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.5 } }}
            >
              <Box component="img" src={messageIcon} alt="" sx={{ width: 19, height: 19, display: "block" }} />
            </ButtonBase>
          ) : null}
          <ButtonBase
            aria-label={he.flowBack}
            data-testid="flow-page-back"
            disabled={backDisabled}
            onClick={onBack}
            sx={{ flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
          >
            <Box component="img" src={arrowLeftIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
          </ButtonBase>
        </Box>
      </Box>
      {progress && progress.total > 0 ? <Stepper done={progress.done} total={progress.total} /> : null}
    </Box>
  );
}
