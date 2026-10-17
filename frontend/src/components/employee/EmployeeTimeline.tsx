import { Box, alpha } from "@mui/material";
import { he } from "../../i18n/he";
import { taskStatusVisual } from "../../constants/taskStatusVisual";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import { EMPLOYEE_BRAND, EMPLOYEE_INK } from "../../styles/employeeUi";
import { timelineTimeLabel, type TimelineEntry } from "../../utils/employeeTimeline";
import EmployeeNextTaskCard from "./EmployeeNextTaskCard";
import EmployeeTaskRow from "./EmployeeTaskRow";

interface EmployeeTimelineProps {
  entries: TimelineEntry<EmployeeTaskCard>[];
  onOpen: (task: EmployeeTaskCard) => void;
}

const RAIL_WIDTH = 38;
const DYNAMIC_RED = "#DC2626";
const MUTE = "#64748B";

function dotColor(entry: TimelineEntry<EmployeeTaskCard>): string {
  if (entry.isNext) return EMPLOYEE_BRAND;
  if (entry.task.status === "overdue") return taskStatusVisual("overdue").bar;
  return entry.isDynamic ? DYNAMIC_RED : "#94A3B8";
}

/** Colonne fine à droite : petite heure, point, trait continu jusqu'à la ligne suivante. */
function Rail({ entry, last }: { entry: TimelineEntry<EmployeeTaskCard>; last: boolean }) {
  const color = dotColor(entry);
  const size = entry.isNext ? 12 : 8;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
      <Box
        component="time"
        dir="ltr"
        sx={{ fontSize: "0.7rem", fontWeight: 600, lineHeight: 1, color: MUTE }}
      >
        {timelineTimeLabel(entry.task.due_at)}
      </Box>
      <Box
        aria-hidden
        data-testid="timeline-dot"
        sx={{
          mt: 0.75,
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: "50%",
          bgcolor: color,
          ...(entry.isNext ? { boxShadow: `0 0 0 4px ${alpha(color, 0.18)}` } : {}),
        }}
      />
      {last ? null : (
        <Box aria-hidden sx={{ mt: 0.5, width: "2px", flex: 1, minHeight: 12, bgcolor: alpha(EMPLOYEE_INK, 0.1) }} />
      )}
    </Box>
  );
}

function TimelineRow({
  entry,
  last,
  onOpen,
}: {
  entry: TimelineEntry<EmployeeTaskCard>;
  last: boolean;
  onOpen: (task: EmployeeTaskCard) => void;
}) {
  return (
    <Box
      component="li"
      sx={{ display: "grid", gridTemplateColumns: `${RAIL_WIDTH}px minmax(0, 1fr)`, columnGap: 1, pb: last ? 0 : 1.25 }}
    >
      <Rail entry={entry} last={last} />
      {entry.isNext ? (
        <EmployeeNextTaskCard task={entry.task} onOpen={onOpen} />
      ) : (
        <EmployeeTaskRow task={entry.task} onOpen={onOpen} layout="list" />
      )}
    </Box>
  );
}

/** Tâches ouvertes sur un ציר זמן discret : la rampe est à droite, la tâche suivante en grand. */
export default function EmployeeTimeline({ entries, onOpen }: EmployeeTimelineProps) {
  if (entries.length === 0) return null;
  return (
    <Box
      component="ol"
      aria-label={he.employeeTimelineLabel}
      data-testid="employee-timeline"
      sx={{ listStyle: "none", m: 0, mb: 2.5, p: 0 }}
    >
      {entries.map((entry, index) => (
        <TimelineRow
          key={entry.task.id}
          entry={entry}
          last={index === entries.length - 1}
          onOpen={onOpen}
        />
      ))}
    </Box>
  );
}
