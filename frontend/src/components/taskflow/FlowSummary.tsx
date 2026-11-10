import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import { hasPendingUpload, summaryRows } from "../../utils/flowSummary";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { SlotUiState } from "../../utils/slotUploadState";

type Props = {
  title: string;
  requirements: CompletionRequirement[];
  states: SlotUiState[];
  /** Libellé du bouton ; par défaut « התחלת יום עבודה ». */
  continueLabel?: string;
  onContinue: () => void;
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

/**
 * Écran 10 : récap. Affiché même si un envoi attend le réseau (statut « ממתין להעלאה » sur sa ligne).
 * Le bouton mène directement aux tâches du jour, sans étape intermédiaire.
 */
export default function FlowSummary({ title, requirements, states, continueLabel, onContinue }: Props) {
  const rows = summaryRows(requirements, states);
  const sentCount = rows.filter((r) => r.sent).length;
  return (
    <Box
      data-testid="flow-summary"
      dir="rtl"
      sx={{ minHeight: "100dvh", background: flowScreenBackground, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ width: "100%", maxWidth: 393, px: `${flowSize.contentPaddingX}px`, pt: "calc(64px + env(safe-area-inset-top, 0px))", pb: 3, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <Box sx={{ width: 72, height: 72, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: flowColor.green300, alignSelf: "center" }}>
          <CheckRoundedIcon sx={{ fontSize: 40, color: flowColor.green700 }} />
        </Box>
        <Typography component="h1" sx={{ ...flowText.h1, color: flowColor.neutral900, textAlign: "center" }}>
          {title}
        </Typography>
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center" }}>
          {he.flowSummarySubtitle(sentCount, rows.length)}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
          {rows.map((row) => (
            <Row key={row.index} title={row.title} statusText={row.statusText} sent={row.sent} />
          ))}
        </Box>
        {hasPendingUpload(states) ? (
          <Typography data-testid="flow-summary-pending" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_66, textAlign: "center" }}>
            {he.flowSummaryPendingNote}
          </Typography>
        ) : null}
        <ButtonBase
          data-testid="flow-summary-continue"
          onClick={onContinue}
          sx={{ mt: "auto", height: flowSize.roundButton, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button }}
        >
          {continueLabel ?? he.flowSummaryStartDay}
        </ButtonBase>
      </Box>
    </Box>
  );
}
