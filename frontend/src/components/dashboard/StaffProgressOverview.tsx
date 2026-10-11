import { Box, Typography } from "@mui/material";
import type { TeamMember, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import SectionHeading from "../ui/SectionHeading";
import StaffProgressCard from "./StaffProgressCard";

interface StaffProgressOverviewProps {
  team: TeamMember[];
  onChanged?: () => void;
  onOpenTask?: (task: TimelineTask) => void;
}

export default function StaffProgressOverview({ team, onChanged, onOpenTask }: StaffProgressOverviewProps) {
  const presentCount = team.filter((m) =>
    [...(m.timeline ?? []), ...(m.overdue_backlog ?? [])].some((t) => Boolean(t.started_at)),
  ).length;

  return (
    <Box mb={3}>
      <SectionHeading title={he.dashboardStaffOverview} count={team.length} mb={0.5} />
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {team.length === 0
          ? he.dashboardStaffOverviewEmpty
          : he.dashboardStaffOverviewHint(presentCount, team.length)}
      </Typography>

      {team.length === 0 ? null : (
        <Box>
          {team.map((member) => (
            <StaffProgressCard
              key={member.user_id}
              member={member}
              onChanged={onChanged}
              onOpenTask={onOpenTask}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
