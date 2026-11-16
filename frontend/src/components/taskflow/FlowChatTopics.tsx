import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import type { TopicChoice } from "../../utils/flowChat";

type Props = {
  choices: TopicChoice[];
  selected: number | null;
  /** Appuyer sur le sujet déjà choisi le retire : le message redevient général. */
  onSelect: (index: number | null) => void;
};

function TopicPill({ choice, active, onSelect }: { choice: TopicChoice; active: boolean; onSelect: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-chat-choice"
      data-done={choice.done ? "true" : "false"}
      aria-pressed={active}
      onClick={onSelect}
      sx={{
        ...flowText.button,
        height: 40,
        px: "20px",
        gap: "6px",
        flexShrink: 0,
        borderRadius: `${flowRadius.full}px`,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        color: active ? flowColor.neutral0 : flowColor.neutral900,
        bgcolor: active ? flowColor.neutral900 : flowColor.neutral0,
        border: `1px solid ${active ? flowColor.neutral900 : flowColor.line}`,
      }}
    >
      {choice.done ? <CheckRoundedIcon data-testid="flow-chat-choice-done" sx={{ fontSize: 16, color: flowColor.green700 }} /> : null}
      {choice.label}
    </ButtonBase>
  );
}

/** « על איזה סרטון מדברים ? » : pastilles des sous-tâches (noire = choisie, coche verte = remise). */
export default function FlowChatTopics({ choices, selected, onSelect }: Props) {
  if (!choices.length) return null;
  return (
    <Box data-testid="flow-chat-picker" sx={{ display: "flex", flexDirection: "column", gap: "8px", px: "24px", pb: "16px" }}>
      <Typography sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66 }}>{he.flowChatWhichTopic}</Typography>
      <Box role="group" aria-label={he.flowChatWhichTopic} sx={{ display: "flex", gap: "8px", overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
        {choices.map((choice) => (
          <TopicPill key={choice.index} choice={choice} active={choice.index === selected} onSelect={() => onSelect(choice.index === selected ? null : choice.index)} />
        ))}
      </Box>
    </Box>
  );
}
