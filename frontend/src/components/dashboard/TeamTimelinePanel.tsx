import { Typography } from "@mui/material";
import type { TeamMember } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import DashboardSectionAccordion from "./DashboardSectionAccordion";
import DashboardTimelineLegend from "./DashboardTimelineLegend";
import EmployeeTimelineCard from "./EmployeeTimelineCard";

export interface TeamTimelinePanelProps {
  team: TeamMember[];
  onEmployeeClick?: (member: TeamMember) => void;
}

export default function TeamTimelinePanel({ team, onEmployeeClick }: TeamTimelinePanelProps) {
  const activeCount = team.filter((m) => m.is_active).length;
  const inProgressCount = team.filter((m) => m.status === "in_progress").length;

  const summaryHint =
    team.length === 0 ? he.noTasks : he.dashboardTeamAccordionHint(activeCount, team.length, inProgressCount);

  return (
    <DashboardSectionAccordion
      title={he.dashboardTeamTimeline}
      count={team.length}
      countColor={inProgressCount > 0 ? "warning" : "primary"}
      summaryHint={summaryHint}
      mb={0}
    >
      <DashboardTimelineLegend />
      {team.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardNoTimelineTasks}
        </Typography>
      ) : (
        team.map((member) => (
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
