import { Box, ButtonBase, Typography } from "@mui/material";
import backIcon from "../../assets/flow1/chat-back.svg";
import boxIcon from "../../assets/flow1/chat-box.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { chatStatusText, type ChatProgress, type StepBar } from "../../utils/flowChat";

type HeaderProps = {
  title: string;
  managerName?: string | null;
  onBack: () => void;
};

/** « Chat Header » : retour, titre + « צ׳אט משימה · מנהלת », icône de tâche (task/2). */
export function FlowChatHeader({ title, managerName, onBack }: HeaderProps) {
  return (
    <Box
      data-testid="flow-chat-header"
      sx={{ display: "flex", alignItems: "center", gap: "12px", bgcolor: flowColor.neutral0, px: "16px", pt: "calc(16px + env(safe-area-inset-top, 0px))", pb: "12px" }}
    >
      <ButtonBase
        aria-label={he.flowBack}
        data-testid="flow-chat-back"
        onClick={onBack}
        sx={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", bgcolor: flowColor.neutral100 }}
      >
        <Box component="img" src={backIcon} alt="" sx={{ width: 20, height: 20, display: "block" }} />
      </ButtonBase>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px", textAlign: "right" }}>
        <Typography component="h1" data-testid="flow-chat-title" noWrap sx={{ ...flowText.button, color: flowColor.navy800 }}>
          {title}
        </Typography>
        <Typography data-testid="flow-chat-subtitle" noWrap sx={{ ...flowText.caption, color: flowColor.alphaNavy800_60 }}>
          {he.flowChatTitleSub(managerName)}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: `${flowRadius.sm}px`, bgcolor: flowColor.green300 }}>
        <Box component="img" src={boxIcon} alt="" sx={{ width: 20, height: 20, display: "block" }} />
      </Box>
    </Box>
  );
}

const barColor: Record<StepBar, string> = {
  done: flowColor.green700,
  current: flowColor.alphaGreen700_60,
  todo: flowColor.alphaGreen700_20,
};

function StepBars({ bars }: { bars: StepBar[] }) {
  return (
    <Box data-testid="flow-chat-bars" sx={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {bars.map((bar, index) => (
        <Box key={index} data-state={bar} sx={{ width: 14, height: 4, borderRadius: "2px", bgcolor: barColor[bar] }} />
      ))}
    </Box>
  );
}

/** « Task Context Bar » : progression par étape, statut, lien vers la tâche. */
export function FlowChatContextBar({ progress, onOpenTask }: { progress: ChatProgress; onOpenTask: () => void }) {
  return (
    <Box
      data-testid="flow-chat-context"
      sx={{ display: "flex", alignItems: "center", gap: "8px", px: "16px", py: "10px", bgcolor: flowColor.alphaGreen300_45 }}
    >
      <StepBars bars={progress.bars} />
      <Typography data-testid="flow-chat-status" sx={{ ...flowText.caption, color: flowColor.navy800, whiteSpace: "nowrap" }}>
        {chatStatusText(progress)}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <ButtonBase data-testid="flow-chat-task-link" onClick={onOpenTask} sx={{ ...flowText.caption, color: flowColor.green700, whiteSpace: "nowrap" }}>
        {he.flowChatTaskLink}
      </ButtonBase>
    </Box>
  );
}
