import { Box, ButtonBase, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { teamRowLine, teamSections, type TeamRosterEntry } from "../../utils/managerTeam";
import { HomeChip, HomeSectionTitle } from "../dashboard/home/homeUi";
import TeamPersonAvatar from "./TeamPersonAvatar";

function TeamRow({ entry, showBranch, onOpen }: { entry: TeamRosterEntry; showBranch: boolean; onOpen: (e: TeamRosterEntry) => void }) {
  return (
    <ButtonBase
      data-testid={`team-row-${entry.id}`}
      data-state={entry.state}
      onClick={() => onOpen(entry)}
      sx={{ width: "100%", minHeight: 64, px: "12px", py: "8px", gap: "12px", justifyContent: "flex-start", textAlign: "right", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 }}
    >
      <TeamPersonAvatar name={entry.name} initial={entry.initial} state={entry.state} photoUrl={entry.photoUrl} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{entry.name}</Typography>
        <Typography noWrap sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{teamRowLine(entry, showBranch)}</Typography>
      </Box>
      {entry.late > 0 ? <HomeChip tone="warning">{he.managerHomeOverdue(entry.late)}</HomeChip> : null}
      {entry.total > 0 ? (
        <Typography data-testid="team-row-progress" sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_60, whiteSpace: "nowrap" }} dir="ltr">
          {`${entry.done}/${entry.total}`}
        </Typography>
      ) : null}
      <ChevronLeftIcon sx={{ color: flowColor.neutral600, fontSize: 20 }} />
    </ButtonBase>
  );
}

type Props = { entries: TeamRosterEntry[]; showBranch: boolean; emptyText: string; onOpen: (entry: TeamRosterEntry) => void };

/** Oveds regroupés par état du jour : ceux qui n'ont rien en cours d'abord, puis au travail, pas arrivés, finis. */
export default function ManagerTeamList({ entries, showBranch, emptyText, onOpen }: Props) {
  if (!entries.length) {
    return <Typography data-testid="team-empty" sx={{ ...flowText.body, textAlign: "center", color: flowColor.alphaNeutral900_60, py: 6 }}>{emptyText}</Typography>;
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {teamSections(entries).map((section) => (
        <Box component="section" key={section.state} data-testid={`team-section-${section.state}`} sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <HomeSectionTitle>{`${he.managerTeamSections[section.state]} · ${section.entries.length}`}</HomeSectionTitle>
          {section.entries.map((entry) => <TeamRow key={entry.id} entry={entry} showBranch={showBranch} onOpen={onOpen} />)}
        </Box>
      ))}
    </Box>
  );
}
