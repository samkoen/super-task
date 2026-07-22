import { Box, Typography } from "@mui/material";
import type { TeamMember } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import StaffProgressCard from "./StaffProgressCard";

interface StaffProgressOverviewProps {
  team: TeamMember[];
  onChanged?: () => void;
}

export default function StaffProgressOverview({ team, onChanged }: StaffProgressOverviewProps) {
  const presentCount = team.filter((m) =>
    [...(m.timeline ?? []), ...(m.overdue_backlog ?? [])].some((t) => Boolean(t.started_at)),
  ).length;

  return (
    <Box mb={3}>
      <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          {he.dashboardStaffOverview}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ({team.length})
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {team.length === 0
          ? he.dashboardStaffOverviewEmpty
          : he.dashboardStaffOverviewHint(presentCount, team.length)}
      </Typography>

      {team.length === 0 ? null : (
        <Box>
          {team.map((member) => (
            <StaffProgressCard key={member.user_id} member={member} onChanged={onChanged} />
          ))}
        </Box>
      )}
    </Box>
  );
}
