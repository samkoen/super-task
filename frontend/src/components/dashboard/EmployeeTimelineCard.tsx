import { Box, Chip, Paper, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { TeamMember } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import {
  buildTimelineRows,
  type TimelineRowKind,
  type TimelineRowModel,
} from "../../utils/dashboardTimelineLayout";
import { formatDurationMinutes } from "../../utils/dashboardTime";
import { healthDotColor } from "./HealthBadge";

const barStyles: Record<
  TimelineRowKind,
  { bgcolor: string; dashed?: boolean; pulse?: boolean }
> = {
  completed: { bgcolor: healthDotColor("green") },
  in_progress: { bgcolor: healthDotColor("orange"), pulse: true },
  pending_review: { bgcolor: "#0288d1" },
  awaiting_response: { bgcolor: "#ed6c02", pulse: true },
  upcoming: { bgcolor: "grey.400", dashed: true },
  overdue: { bgcolor: healthDotColor("red") },
};

function StatusIcon({ kind }: { kind: TimelineRowKind }) {
  if (kind === "completed") {
    return <CheckIcon sx={{ fontSize: 16, color: healthDotColor("green"), flexShrink: 0 }} />;
  }
  if (kind === "overdue") {
    return <WarningAmberIcon sx={{ fontSize: 16, color: healthDotColor("red"), flexShrink: 0 }} />;
  }
  if (kind === "in_progress") {
    return (
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: healthDotColor("orange"),
          flexShrink: 0,
          animation: "timelinePulse 1.6s ease-in-out infinite",
          "@keyframes timelinePulse": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.5, transform: "scale(0.85)" },
          },
        }}
      />
    );
  }
  if (kind === "pending_review") {
    return (
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: "#0288d1",
          flexShrink: 0,
        }}
      />
    );
  }
  if (kind === "awaiting_response") {
    return (
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: "#ed6c02",
          flexShrink: 0,
          animation: "timelinePulse 1.6s ease-in-out infinite",
          "@keyframes timelinePulse": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.5, transform: "scale(0.85)" },
          },
        }}
      />
    );
  }
  return null;
}

function TimelineBarRow({ row }: { row: TimelineRowModel }) {
  const style = barStyles[row.kind];
  const detail =
    row.kind === "completed" && row.durationLabel
      ? `(${row.durationLabel})`
        : row.kind === "in_progress"
        ? he.dashboardInProgressSince(
            row.timeLabel,
            row.task.elapsed_minutes != null
              ? formatDurationMinutes(row.task.elapsed_minutes)
              : "",
          )
        : row.kind === "pending_review"
          ? he.timelineSegmentPendingReview
          : row.kind === "upcoming"
          ? he.timelineSegmentUpcoming
          : he.timelineSegmentOverdue;

  return (
    <Box display="flex" alignItems="center" gap={1.25} py={0.65} sx={{ minHeight: 32 }}>
      <Typography
        variant="body2"
        sx={{
          minWidth: 46,
          fontFamily: "monospace",
          fontWeight: 600,
          color: row.kind === "overdue" ? "error.main" : "text.primary",
        }}
      >
        {row.timeLabel}
      </Typography>

      <Box
        sx={{
          width: `${row.barPercent}%`,
          minWidth: 28,
          maxWidth: "38%",
          height: 12,
          borderRadius: 1,
          bgcolor: style.dashed ? "transparent" : style.bgcolor,
          border: style.dashed ? "2px dashed" : "none",
          borderColor: style.dashed ? style.bgcolor : undefined,
          flexShrink: 0,
          animation: style.pulse ? "timelinePulse 1.6s ease-in-out infinite" : undefined,
        }}
      />

      <Box display="flex" alignItems="center" gap={0.75} flex={1} minWidth={0}>
        <Typography
          variant="body2"
          fontWeight={row.kind === "in_progress" ? 800 : 600}
          noWrap
          sx={{ color: row.kind === "overdue" ? "error.main" : "text.primary" }}
        >
          {row.task.title}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {detail}
          </Typography>
        )}
        <StatusIcon kind={row.kind} />
      </Box>
    </Box>
  );
}

export interface EmployeeTimelineCardProps {
  member: TeamMember;
  onEmployeeClick?: (member: TeamMember) => void;
}

export default function EmployeeTimelineCard({ member, onEmployeeClick }: EmployeeTimelineCardProps) {
  const rows = buildTimelineRows(member.timeline, member.overdue_backlog);
  const clickable = Boolean(onEmployeeClick);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={1}
        mb={1.5}
        pb={1}
        borderBottom="1px solid"
        borderColor="divider"
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onEmployeeClick?.(member) : undefined}
        onKeyDown={
          clickable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEmployeeClick?.(member);
                }
              }
            : undefined
        }
        sx={
          clickable
            ? {
                cursor: "pointer",
                borderRadius: 1,
                mx: -0.5,
                px: 0.5,
                "&:hover": { bgcolor: "action.hover" },
              }
            : undefined
        }
      >
        <Box minWidth={0}>
          <Typography fontWeight={800}>
            {member.full_name}
            {(member.current_department_name || member.job_function) && (
              <Typography component="span" color="text.secondary" fontWeight={600}>
                {" · "}
                {member.current_department_name || member.job_function}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
          <Chip
            size="small"
            color={member.status === "in_progress" ? "warning" : member.is_active ? "success" : "default"}
            label={
              member.status === "in_progress"
                ? he.teamInProgress
                : member.is_active
                  ? he.teamActive
                  : he.teamIdle
            }
          />
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {he.dashboardTasksProgress(member.completed_today, member.total_today)}
          </Typography>
        </Box>
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardNoTimelineTasks}
        </Typography>
      ) : (
        rows.map((row) => <TimelineBarRow key={`${row.kind}-${row.task.id}`} row={row} />)
      )}
    </Paper>
  );
}
