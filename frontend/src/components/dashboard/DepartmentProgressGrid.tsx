import { Box, LinearProgress, Typography } from "@mui/material";
import type { DepartmentSummary } from "../../services/dashboardService";
import HealthBadge, { healthDotColor } from "./HealthBadge";
import DashboardSectionAccordion from "./DashboardSectionAccordion";
import { he } from "../../i18n/he";

export interface DepartmentProgressGridProps {
  departments: DepartmentSummary[];
}

export default function DepartmentProgressGrid({ departments }: DepartmentProgressGridProps) {
  const overdueTotal = departments.reduce((sum, d) => sum + d.overdue, 0);
  const avgPercent =
    departments.length === 0
      ? 0
      : Math.round(
          departments.reduce((sum, d) => sum + d.completion_rate * 100, 0) / departments.length,
        );

  const summaryHint =
    departments.length === 0
      ? he.noTasks
      : `${avgPercent}% ${he.dashboardCompletion}${overdueTotal > 0 ? ` · ${overdueTotal} ${he.dashboardOverdue}` : ""}`;

  return (
    <DashboardSectionAccordion
      title={he.dashboardDepartmentsLive}
      count={departments.length}
      countColor={overdueTotal > 0 ? "error" : "default"}
      summaryHint={summaryHint}
    >
      <Box display="flex" flexDirection="column" gap={2}>
        {departments.map((dept) => {
          const percent = Math.round(dept.completion_rate * 100);
          return (
            <Box
              key={dept.department_id ?? "none"}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                borderInlineStart: `4px solid ${healthDotColor(dept.health)}`,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography fontWeight={700}>{dept.name}</Typography>
                <HealthBadge level={dept.health} />
              </Box>
              <Box display="flex" alignItems="center" gap={1.5}>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{ flex: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 40 }}>
                  {percent}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {dept.total === 0
                  ? he.noTasks
                  : `${dept.completed} ${he.taskCompleted} · ${dept.in_progress} ${he.teamInProgress} · ${dept.pending} ${he.pending}${dept.overdue > 0 ? ` · ${dept.overdue} ${he.dashboardOverdue}` : ""}`}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </DashboardSectionAccordion>
  );
}
