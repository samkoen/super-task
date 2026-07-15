import { Box, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { he } from "../../i18n/he";
import { healthDotColor } from "./HealthBadge";

const legendItems = [
  { color: healthDotColor("green"), label: he.timelineLegendCompleted, icon: "check" as const },
  { color: healthDotColor("orange"), label: he.timelineLegendInProgress, pulse: true },
  { color: "#0288d1", label: he.timelineLegendPendingReview },
  { color: "grey.400", label: he.timelineLegendUpcoming, dashed: true },
  { color: healthDotColor("red"), label: he.timelineLegendOverdue, icon: "warn" as const },
];

export default function DashboardTimelineLegend() {
  return (
    <Box display="flex" flexWrap="wrap" gap={2} mb={1.5} alignItems="center">
      <Typography variant="caption" fontWeight={700} color="text.secondary">
        {he.dashboardTimelineLegend}:
      </Typography>
      {legendItems.map((item) => (
        <Box key={item.label} display="flex" alignItems="center" gap={0.75}>
          <Box
            sx={{
              width: 28,
              height: 10,
              borderRadius: 1,
              bgcolor: item.dashed ? "transparent" : item.color,
              border: item.dashed ? "2px dashed" : "none",
              borderColor: item.dashed ? item.color : undefined,
              animation: item.pulse ? "timelinePulse 1.6s ease-in-out infinite" : undefined,
              "@keyframes timelinePulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.45 },
              },
            }}
          />
          <Typography variant="caption">{item.label}</Typography>
          {item.icon === "check" && <CheckIcon sx={{ fontSize: 14, color: healthDotColor("green") }} />}
          {item.icon === "warn" && <WarningAmberIcon sx={{ fontSize: 14, color: healthDotColor("red") }} />}
        </Box>
      ))}
    </Box>
  );
}
