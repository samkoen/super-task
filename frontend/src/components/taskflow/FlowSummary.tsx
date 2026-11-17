import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import arrowLeftIcon from "../../assets/flow1/icon-arrow-left.svg";
import summaryDone from "../../assets/flow1/summary-done.png";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import {
  hasPendingUpload,
  partialHeadline,
  summaryCardHeading,
  summaryPhase,
  summaryRows,
  type SummaryPhase,
  type SummaryRow,
} from "../../utils/flowSummary";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { handedOverCount, type SlotUiState } from "../../utils/slotUploadState";
import { withSystemBottomInsetCss, withSystemTopInsetCss } from "../../utils/systemInsets";

type Props = {
  /** Ouverture de משמרת : le titre et le bouton final parlent de la journée, pas d'une simple tâche. */
  shiftOpening: boolean;
  requirements: CompletionRequirement[];
  states: SlotUiState[];
  /** Un envoi est en cours (le bouton est bloqué). */
  sending: boolean;
  /** « שליחת הסרטונים » : envoie au serveur tout ce qui a été confirmé. */
  onSend: () => void;
  /** Bouton final une fois tout envoyé. */
  onContinue: () => void;
  /** Retour aux cartes, tant que rien n'est parti au serveur. */
  onBack?: () => void;
  /** « לצלם עכשיו » : rouvre une carte marquée « לא ניתן לצלם » pour la filmer. */
  onFilmNow?: (index: number) => void;
};

type Tone = "sent" | "skipped" | "waiting";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  sent: { bg: flowColor.green300, fg: flowColor.green700 },
  skipped: { bg: flowColor.yellow300, fg: flowColor.neutral900 },
  waiting: { bg: flowColor.neutral300, fg: flowColor.navy800 },
};

function toneOf(row: SummaryRow): Tone {
  if (row.skipped) return "skipped";
  return row.sent ? "sent" : "waiting";
}

function StatusIcon({ tone }: { tone: Tone }) {
  const Icon = tone === "sent" ? CheckRoundedIcon : tone === "skipped" ? ErrorOutlineRoundedIcon : ScheduleRoundedIcon;
  const { bg, fg } = TONES[tone];
  return (
    <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%", flexShrink: 0, bgcolor: bg }}>
      <Icon sx={{ fontSize: 18, color: fg }} />
    </Box>
  );
}

function FilmNowButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-summary-film-now"
      onClick={onClick}
      sx={{ height: 36, px: "14px", flexShrink: 0, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.label }}
    >
      {he.flowSummaryFilmNow}
    </ButtonBase>
  );
}

function rowCaption(row: SummaryRow): string {
  if (row.notYet) return he.flowSummaryNotYet;
  if (row.skipped) return he.flowSummarySkipped(row.reasonText);
  return row.sent ? he.flowSummaryShotAt(row.sentTime) : row.statusText;
}

function Row({ row, onFilmNow }: { row: SummaryRow; onFilmNow?: (index: number) => void }) {
  const tone = toneOf(row);
  const caption = (
    <Typography data-testid="flow-summary-caption" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66 }}>
      {rowCaption(row)}
    </Typography>
  );
  return (
    <Box
      data-testid="flow-summary-row"
      data-sent={row.sent ? "true" : "false"}
      data-skipped={row.skipped ? "true" : "false"}
      data-not-yet={row.notYet ? "true" : "false"}
      sx={{ display: "flex", alignItems: "center", gap: 1.5, minHeight: 44 }}
    >
      <StatusIcon tone={tone} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ ...flowText.button, color: flowColor.neutral900, overflowWrap: "anywhere" }}>{row.title}</Typography>
        {row.skipped || row.notYet ? caption : null}
        {row.errorText ? (
          <Typography data-testid="flow-summary-error" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66, overflowWrap: "anywhere" }}>
            {row.errorText}
          </Typography>
        ) : null}
      </Box>
      {row.skipped || row.notYet ? null : caption}
      {row.canFilmNow && onFilmNow ? <FilmNowButton onClick={() => onFilmNow(row.index)} /> : null}
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

/** Titre + sous-titre : « 2 מתוך 3 סרטונים צולמו » quand une carte n'a pas été filmée (10ב). */
function headlineFor(phase: SummaryPhase, shiftOpening: boolean, states: SlotUiState[], rows: SummaryRow[]) {
  const partial = phase === "done" ? null : partialHeadline(states);
  if (partial) return partial;
  const sentCount = rows.filter((r) => r.sent).length;
  const subtitle = phase === "done" ? he.flowSummarySubtitle(sentCount, rows.length) : he.flowSummarySubtitleReady(handedOverCount(states), rows.length);
  return { title: titleFor(phase, shiftOpening), subtitle };
}

function actionOf(phase: SummaryPhase, shiftOpening: boolean, props: Pick<Props, "onSend" | "onContinue" | "onBack">) {
  if (phase === "done") return { testId: "flow-summary-continue", label: shiftOpening ? he.flowSummaryStartDay : he.flowSummaryBack, onClick: props.onContinue };
  // Rien à envoyer mais des cartes restent : on retourne filmer (jamais « terminé » à tort).
  if (phase === "incomplete") return { testId: "flow-summary-back-to-cards", label: he.flowSummaryBackToCards, onClick: props.onBack ?? props.onContinue };
  return { testId: "flow-summary-send", label: phase === "sending" ? he.flowSummarySending : he.flowSummarySend, onClick: props.onSend };
}

function ActionButton({ phase, shiftOpening, onSend, onContinue, onBack }: Pick<Props, "shiftOpening" | "onSend" | "onContinue" | "onBack"> & { phase: SummaryPhase }) {
  const action = actionOf(phase, shiftOpening, { onSend, onContinue, onBack });
  return (
    <ButtonBase
      data-testid={action.testId}
      data-phase={phase}
      disabled={phase === "sending"}
      onClick={action.onClick}
      sx={{ mt: "auto", gap: 1, height: flowSize.roundButton, borderRadius: `${flowRadius.sm}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button, fontSize: 18, fontWeight: 700, "&.Mui-disabled": { opacity: 0.7, color: flowColor.neutral0 } }}
    >
      {phase === "sending" ? <CircularProgress size={18} color="inherit" /> : null}
      {action.label}
    </ButtonBase>
  );
}

function RowsCard({ shiftOpening, states, rows, onFilmNow }: { shiftOpening: boolean; states: SlotUiState[]; rows: SummaryRow[]; onFilmNow?: (index: number) => void }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2.5, borderRadius: `${flowRadius.xl2}px`, bgcolor: flowColor.neutral0 }}>
      {shiftOpening ? (
        <Typography data-testid="flow-summary-card-title" sx={{ ...flowText.button, color: flowColor.neutral900 }}>
          {summaryCardHeading(states)}
        </Typography>
      ) : null}
      {rows.map((row) => (
        <Row key={row.index} row={row} onFilmNow={onFilmNow} />
      ))}
    </Box>
  );
}

/**
 * Écran 10 / 10ב : récap de fin de tâche, et c'est ici que tout part au serveur.
 * D'abord « שליחת הסרטונים » (rien n'est encore envoyé), puis, une fois envoyé, les heures d'envoi et le bouton final.
 * Une carte « לא ניתן לצלם » s'affiche avec sa raison et peut être filmée avant l'envoi (« לצלם עכשיו »).
 * Un fichier qui attend le réseau reste visible avec son statut « ממתין להעלאה ».
 */
export default function FlowSummary({ shiftOpening, requirements, states, sending, onSend, onContinue, onBack, onFilmNow }: Props) {
  const rows = summaryRows(requirements, states);
  const phase = summaryPhase(states, sending);
  const { title, subtitle } = headlineFor(phase, shiftOpening, states, rows);
  return (
    <Box
      data-testid="flow-summary"
      dir="rtl"
      sx={{ minHeight: "100dvh", background: flowScreenBackground, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ width: "100%", maxWidth: 393, px: `${flowSize.contentPaddingX}px`, pt: withSystemTopInsetCss("24px"), pb: withSystemBottomInsetCss("24px"), display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {(phase === "ready" || phase === "incomplete") && onBack ? <BackButton onBack={onBack} /> : null}
        <Box component="img" src={summaryDone} alt="" sx={{ width: 280, maxWidth: "80%", alignSelf: "center", display: "block" }} />
        <Typography component="h1" data-testid="flow-summary-title" sx={{ ...flowText.h1, color: flowColor.neutral900, textAlign: "center" }}>
          {title}
        </Typography>
        <Typography data-testid="flow-summary-subtitle" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center" }}>
          {subtitle}
        </Typography>
        <RowsCard shiftOpening={shiftOpening} states={states} rows={rows} onFilmNow={onFilmNow} />
        {phase === "done" && hasPendingUpload(states) ? (
          <Typography data-testid="flow-summary-pending" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66, textAlign: "center" }}>
            {he.flowSummaryPendingNote}
          </Typography>
        ) : null}
        <ActionButton phase={phase} shiftOpening={shiftOpening} onSend={onSend} onContinue={onContinue} onBack={onBack} />
      </Box>
    </Box>
  );
}
