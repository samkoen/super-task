import { Box, ButtonBase, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { flowColor, flowText } from "../../../styles/flowTokens";
import type { ManagerPulse, PeriodProgress } from "../../../utils/managerHome";
import { HomeChip, homeCardSx } from "./homeUi";

/** Couleur d'un tronçon : vert plein = fini, vert clair = commencé, gris = rien encore. */
function segmentColor({ total, done }: PeriodProgress): string {
  if (total > 0 && done >= total) return flowColor.green700;
  if (done > 0) return flowColor.green300;
  return flowColor.neutral300;
}

function PeriodBar({ periods }: { periods: PeriodProgress[] }) {
  return (
    <Box data-testid="pulse-periods" sx={{ display: "flex", gap: "4px" }}>
      {periods.map((p) => (
        <Box key={p.period} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <Box data-testid={`pulse-period-${p.period}`} sx={{ width: "100%", height: 8, borderRadius: 4, bgcolor: segmentColor(p) }} />
          <Typography sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_60 }}>{he.managerHomePeriods[p.period]}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function kpiLine(pulse: ManagerPulse): string {
  return [
    pulse.cleaningPct != null ? he.managerHomeKpiCleaning(pulse.cleaningPct) : "",
    pulse.frontsPct != null ? he.managerHomeKpiFronts(pulse.frontsPct) : "",
  ].filter(Boolean).join(" · ");
}

type Props = { pulse: ManagerPulse; analysisOpen: boolean; onToggleAnalysis: () => void };

/**
 * Carte « הדופק של הסניף » : une phrase d'état, le retard en pastille, la barre בוקר · צהריים · ערב
 * et les KPI ניקיון / חזיתות. Un tap ouvre le ניתוח מצב détaillé (remplace 4 tuiles + KPI).
 */
export default function ManagerPulseCard({ pulse, analysisOpen, onToggleAnalysis }: Props) {
  const kpis = kpiLine(pulse);
  return (
    <ButtonBase
      data-testid="manager-pulse"
      aria-expanded={analysisOpen}
      aria-label={analysisOpen ? he.managerHomeCloseAnalysis : he.managerHomeOpenAnalysis}
      onClick={onToggleAnalysis}
      sx={{ ...homeCardSx, alignItems: "stretch", textAlign: "right", width: "100%" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ ...flowText.h2, color: flowColor.neutral900 }}>
          {pulse.total > 0 ? he.managerHomeDone(pulse.completionPct) : he.managerHomeNoTasks}
        </Typography>
        <HomeChip tone={pulse.overdue > 0 ? "warning" : "neutral"}>
          {pulse.overdue > 0 ? he.managerHomeOverdue(pulse.overdue) : he.managerHomeOnTime}
        </HomeChip>
      </Box>
      <PeriodBar periods={pulse.periods} />
      {kpis ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{kpis}</Typography> : null}
    </ButtonBase>
  );
}
