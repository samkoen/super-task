import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import arrowLeftIcon from "../../assets/flow1/icon-arrow-left.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import { hasPendingUpload, summaryPhase, summaryRows, type SummaryPhase } from "../../utils/flowSummary";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { handedOverCount, type SlotUiState } from "../../utils/slotUploadState";

type Props = {
  /** Ouverture de משמרת : le titre et le bouton final parlent de la journée, pas d'une simple tâche. */
  shiftOpening: boolean;
  requirements: CompletionRequirement[];
  states: SlotUiState[];
  /** Un envoi est en cours (le bouton est bloqué). */
  sending: boolean;
  /** « אישור ושליחה » : envoie au serveur tout ce qui a été confirmé. */
  onSend: () => void;
  /** Bouton final une fois tout envoyé. */
  onContinue: () => void;
  /** Retour aux cartes, tant que rien n'est parti au serveur. */
  onBack?: () => void;
};

function Row({ title, statusText, sent }: { title: string; statusText: string; sent: boolean }) {
  const Icon = sent ? CheckRoundedIcon : ScheduleRoundedIcon;
  return (
    <Box
      data-testid="flow-summary-row"
      data-sent={sent ? "true" : "false"}
      sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 }}
    >
      <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%", flexShrink: 0, bgcolor: sent ? flowColor.green300 : flowColor.neutral300 }}>
        <Icon sx={{ fontSize: 18, color: sent ? flowColor.green700 : flowColor.navy800 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ ...flowText.button, color: flowColor.neutral900, overflowWrap: "anywhere" }}>{title}</Typography>
        <Typography sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66 }}>{statusText}</Typography>
      </Box>
    </Box>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Box sx={{ alignSelf: "stretch", display: "flex", justifyContent: "flex-end" }}>
      <ButtonBase
        aria-label={he.flowBack}
        data-testid="flow-summary-back"
        onClick={onBack}
        sx={{ width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
      >
        <Box component="img" src={arrowLeftIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}

function titleFor(phase: SummaryPhase, shiftOpening: boolean): string {
  if (phase !== "done") return he.flowSummaryTitleReady;
  return shiftOpening ? he.flowSummaryTitleOpen : he.flowSummaryTitleTask;
}

function ActionButton({ phase, shiftOpening, onSend, onContinue }: Pick<Props, "shiftOpening" | "onSend" | "onContinue"> & { phase: SummaryPhase }) {
  const done = phase === "done";
  const label = done ? (shiftOpening ? he.flowSummaryStartDay : he.flowSummaryBack) : phase === "sending" ? he.flowSummarySending : he.flowSummarySend;
  return (
    <ButtonBase
      data-testid={done ? "flow-summary-continue" : "flow-summary-send"}
      data-phase={phase}
      disabled={phase === "sending"}
      onClick={done ? onContinue : onSend}
      sx={{ mt: "auto", gap: 1, height: flowSize.roundButton, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button, "&.Mui-disabled": { opacity: 0.7, color: flowColor.neutral0 } }}
    >
      {phase === "sending" ? <CircularProgress size={18} color="inherit" /> : null}
      {label}
    </ButtonBase>
  );
}

/**
 * Écran 10 : récap de fin de tâche, et c'est ici que tout part au serveur.
 * D'abord « אישור ושליחה » (rien n'est encore envoyé), puis, une fois envoyé, les heures d'envoi et le bouton final.
 * Un fichier qui attend le réseau reste visible avec son statut « ממתין להעלאה ».
 */
export default function FlowSummary({ shiftOpening, requirements, states, sending, onSend, onContinue, onBack }: Props) {
  const rows = summaryRows(requirements, states);
  const phase = summaryPhase(states, sending);
  const sentCount = rows.filter((r) => r.sent).length;
  const subtitle = phase === "done" ? he.flowSummarySubtitle(sentCount, rows.length) : he.flowSummarySubtitleReady(handedOverCount(states), rows.length);
  return (
    <Box
      data-testid="flow-summary"
      dir="rtl"
      sx={{ minHeight: "100dvh", background: flowScreenBackground, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ width: "100%", maxWidth: 393, px: `${flowSize.contentPaddingX}px`, pt: "calc(24px + env(safe-area-inset-top, 0px))", pb: 3, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {phase === "ready" && onBack ? <BackButton onBack={onBack} /> : null}
        <Box sx={{ width: 72, height: 72, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: flowColor.green300, alignSelf: "center" }}>
          <CheckRoundedIcon sx={{ fontSize: 40, color: flowColor.green700 }} />
        </Box>
        <Typography component="h1" data-testid="flow-summary-title" sx={{ ...flowText.h1, color: flowColor.neutral900, textAlign: "center" }}>
          {titleFor(phase, shiftOpening)}
        </Typography>
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center" }}>{subtitle}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
          {rows.map((row) => (
            <Row key={row.index} title={row.title} statusText={row.statusText} sent={row.sent} />
          ))}
        </Box>
        {phase === "done" && hasPendingUpload(states) ? (
          <Typography data-testid="flow-summary-pending" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66, textAlign: "center" }}>
            {he.flowSummaryPendingNote}
          </Typography>
        ) : null}
        <ActionButton phase={phase} shiftOpening={shiftOpening} onSend={onSend} onContinue={onContinue} />
      </Box>
    </Box>
  );
}
