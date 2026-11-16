import { Box, ButtonBase, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { flowColor, flowText } from "../../../styles/flowTokens";
import type { TeamNowEntry, TeamNowState } from "../../../utils/managerHome";
import { HomeSectionTitle } from "./homeUi";

/** Anneau autour de l'avatar : orange = rien en cours (à regarder), vert = au travail. */
const RING: Record<TeamNowState, { color: string; dashed?: boolean }> = {
  idle: { color: flowColor.orange500 },
  working: { color: flowColor.green700 },
  notArrived: { color: flowColor.neutral300, dashed: true },
  done: { color: flowColor.neutral300 },
};

function Person({ entry, onOpen }: { entry: TeamNowEntry; onOpen: (entry: TeamNowEntry) => void }) {
  const ring = RING[entry.state];
  return (
    <ButtonBase
      data-testid="team-now-person"
      data-state={entry.state}
      aria-label={`${entry.name} · ${entry.detail || he.managerHomeTeamStates[entry.state]}`}
      onClick={() => onOpen(entry)}
      sx={{ width: 76, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: 3, py: 0.5 }}
    >
      <Box
        sx={{
          width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: flowColor.neutral0,
          border: `2.5px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`, ...flowText.h2, color: flowColor.neutral900,
        }}
      >
        {entry.initial}
      </Box>
      <Typography noWrap sx={{ ...flowText.label, color: flowColor.neutral900, maxWidth: "100%" }}>{entry.name}</Typography>
      <Typography sx={{ ...flowText.caption, textAlign: "center", color: entry.state === "idle" ? flowColor.neutral900 : flowColor.alphaNeutral900_60 }}>
        {entry.detail || he.managerHomeTeamStates[entry.state]}
      </Typography>
    </ButtonBase>
  );
}

type Props = { entries: TeamNowEntry[]; onOpen: (entry: TeamNowEntry) => void };

/** « הצוות עכשיו » : une rangée d'avatars défilable, ceux qui n'ont rien en cours en tête. */
export default function ManagerTeamNow({ entries, onOpen }: Props) {
  return (
    <Box component="section" data-testid="manager-team-now" sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <HomeSectionTitle>{he.managerHomeTeamTitle}</HomeSectionTitle>
      {entries.length ? (
        <Box sx={{ display: "flex", gap: "8px", overflowX: "auto", pb: 1, mx: "-4px", px: "4px" }}>
          {entries.map((entry) => (
            <Person key={entry.id} entry={entry} onOpen={onOpen} />
          ))}
        </Box>
      ) : (
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.managerHomeTeamEmpty}</Typography>
      )}
    </Box>
  );
}
