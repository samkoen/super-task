import { Box, Tooltip } from "@mui/material";
import { he } from "../../i18n/he";
import {
  SEGMENT_ORDER,
  segmentPercents,
  type StaffSegmentKey,
  type StaffSegments,
} from "../../utils/staffProgress";

const COLORS: Record<StaffSegmentKey, string> = {
  approved: "#2e7d32",
  awaiting_approval: "#0288d1",
  attention: "#ed6c02",
  not_started: "#bdbdbd",
};

const LABELS: Record<StaffSegmentKey, string> = {
  approved: he.dashboardStaffSegApproved,
  awaiting_approval: he.dashboardStaffSegAwaiting,
  attention: he.dashboardStaffSegAttention,
  not_started: he.dashboardStaffSegNotStarted,
};

interface StaffProgressBarProps {
  segments: StaffSegments;
  total: number;
}

export default function StaffProgressBar({ segments, total }: StaffProgressBarProps) {
  const percents = segmentPercents(segments, total);

  if (total <= 0) {
    return (
      <Box
        sx={{
          height: 12,
          borderRadius: 1,
          bgcolor: "action.hover",
          width: "100%",
        }}
      />
    );
  }

  return (
    <Box
      display="flex"
      width="100%"
      height={12}
      borderRadius={1}
      overflow="hidden"
      sx={{ direction: "ltr" }}
    >
      {SEGMENT_ORDER.map((key) => {
        const width = percents[key];
        if (width <= 0) return null;
        return (
          <Tooltip key={key} title={`${LABELS[key]}: ${segments[key]}`} arrow>
            <Box
              sx={{
                width: `${width}%`,
                bgcolor: COLORS[key],
                height: "100%",
                transition: "width 0.2s ease",
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
