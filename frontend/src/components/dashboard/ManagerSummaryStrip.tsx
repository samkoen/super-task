import type { ReactNode } from "react";
import { Box, LinearProgress, Paper, Typography, alpha } from "@mui/material";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import type { ManagerSummary } from "../../utils/managerSummary";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_CARD_RADIUS } from "../../styles/employeeUi";

export const SUMMARY_COLORS = {
  reviews: "#1565c0",
  messages: "#c62828",
  overdue: "#E65100",
  completion: EMPLOYEE_BRAND,
} as const;

const NEUTRAL = "#64748B";

interface SummaryTileProps {
  testId: string;
  label: string;
  value: ReactNode;
  color: string;
  active: boolean;
  icon: ReactNode;
  footer?: ReactNode;
}

function SummaryTile({ testId, label, value, color, active, icon, footer }: SummaryTileProps) {
  const tone = active ? color : NEUTRAL;
  return (
    <Paper
      variant="outlined"
      data-testid={testId}
      data-active={active ? "true" : "false"}
      sx={{
        p: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minWidth: 0,
        borderRadius: EMPLOYEE_CARD_RADIUS,
        borderColor: alpha(tone, active ? 0.4 : 0.2),
        bgcolor: active ? alpha(color, 0.06) : "background.paper",
        borderInlineStartWidth: 6,
        borderInlineStartColor: tone,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            color: tone,
            bgcolor: alpha(tone, 0.14),
            flex: "0 0 auto",
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
      </Box>
      <Typography component="div" fontWeight={900} sx={{ fontSize: "2.1rem", lineHeight: 1.1, color: tone }}>
        {value}
      </Typography>
      {footer}
    </Paper>
  );
}

function CompletionFooter({ summary }: { summary: ManagerSummary }) {
  return (
    <>
      <LinearProgress
        variant="determinate"
        value={summary.completionPct}
        aria-hidden
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(EMPLOYEE_BRAND, 0.14),
          "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: EMPLOYEE_BRAND },
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {he.managerSummaryCompletionOf(summary.completed, summary.total)}
      </Typography>
    </>
  );
}

/** Quatre chiffres clés : ce qui attend le manager + avancement du jour. */
export default function ManagerSummaryStrip({ summary }: { summary: ManagerSummary }) {
  return (
    <Box
      component="section"
      aria-label={he.managerSummaryLabel}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
        gap: 1.5,
        mb: 2,
      }}
    >
      <SummaryTile
        testId="manager-summary-reviews"
        label={he.managerSummaryReviews}
        value={summary.reviews}
        color={SUMMARY_COLORS.reviews}
        active={summary.reviews > 0}
        icon={<FactCheckOutlinedIcon />}
      />
      <SummaryTile
        testId="manager-summary-messages"
        label={he.managerSummaryMessages}
        value={summary.messages}
        color={SUMMARY_COLORS.messages}
        active={summary.messages > 0}
        icon={<ForumOutlinedIcon />}
      />
      <SummaryTile
        testId="manager-summary-overdue"
        label={he.managerSummaryOverdue}
        value={summary.overdue}
        color={SUMMARY_COLORS.overdue}
        active={summary.overdue > 0}
        icon={<ScheduleOutlinedIcon />}
      />
      <SummaryTile
        testId="manager-summary-completion"
        label={he.managerSummaryCompletion}
        value={`${summary.completionPct}%`}
        color={SUMMARY_COLORS.completion}
        active
        icon={<TaskAltIcon />}
        footer={<CompletionFooter summary={summary} />}
      />
    </Box>
  );
}
