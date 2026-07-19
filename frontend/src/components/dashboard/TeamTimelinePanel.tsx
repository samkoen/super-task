import { useState } from "react";
import { MenuItem, TextField, Typography } from "@mui/material";
import type { TeamMember } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import {
  readStoredTeamTimelineSort,
  sortTeamTimeline,
  TEAM_TIMELINE_SORT_MODES,
  type TeamTimelineSortMode,
  writeStoredTeamTimelineSort,
} from "../../utils/teamTimelineSort";
import DashboardSectionAccordion from "./DashboardSectionAccordion";
import DashboardTimelineLegend from "./DashboardTimelineLegend";
import EmployeeTimelineCard from "./EmployeeTimelineCard";

export interface TeamTimelinePanelProps {
  team: TeamMember[];
  onEmployeeClick?: (member: TeamMember) => void;
}

export default function TeamTimelinePanel({ team, onEmployeeClick }: TeamTimelinePanelProps) {
  const [sortMode, setSortMode] = useState<TeamTimelineSortMode>(() => readStoredTeamTimelineSort());
  const activeCount = team.filter((m) => m.is_active).length;
  const inProgressCount = team.filter((m) => m.status === "in_progress").length;
  const sortedTeam = sortTeamTimeline(team, sortMode);

  const summaryHint =
    team.length === 0 ? he.noTasks : he.dashboardTeamAccordionHint(activeCount, team.length, inProgressCount);

  const handleSortChange = (mode: TeamTimelineSortMode) => {
    setSortMode(mode);
    writeStoredTeamTimelineSort(mode);
  };

  return (
    <DashboardSectionAccordion
      title={he.dashboardTeamTimeline}
      count={team.length}
      countColor={inProgressCount > 0 ? "warning" : "primary"}
      summaryHint={summaryHint}
      mb={0}
    >
      {team.length > 0 && (
        <TextField
          select
          size="small"
          label={he.dashboardTimelineSort}
          value={sortMode}
          onChange={(e) => handleSortChange(e.target.value as TeamTimelineSortMode)}
          sx={{ mb: 1.5, minWidth: 220 }}
        >
          {TEAM_TIMELINE_SORT_MODES.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {he.dashboardTimelineSortModes[mode]}
            </MenuItem>
          ))}
        </TextField>
      )}
      <DashboardTimelineLegend />
      {team.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardNoTimelineTasks}
        </Typography>
      ) : (
        sortedTeam.map((member) => (
          <EmployeeTimelineCard
            key={member.user_id}
            member={member}
            onEmployeeClick={onEmployeeClick}
          />
        ))
      )}
    </DashboardSectionAccordion>
  );
}
