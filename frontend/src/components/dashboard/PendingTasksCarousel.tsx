import { useMemo, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import type { TaskQueues, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { buildCompletedTasks, buildPendingTasks } from "../../utils/dashboardCarousels";
import {
  groupPendingTasks,
  type PendingGroupMode,
} from "../../utils/storeStatusAnalysis";
import SectionHeading from "../ui/SectionHeading";
import PendingTaskMediaCard from "./PendingTaskMediaCard";
import { EMPLOYEE_CARD_RADIUS } from "../../styles/employeeUi";

export type ManagerTaskCarouselKind = "pending" | "completed";

interface PendingTasksCarouselProps {
  queues: TaskQueues | null | undefined;
  kind?: ManagerTaskCarouselKind;
  onOpenTask?: (task: TimelineTask) => void;
  onOpenStatusAnalysis?: () => void;
  stageLabels?: Map<string, string>;
}

function carouselCopy(kind: ManagerTaskCarouselKind) {
  if (kind === "completed") {
    return { title: he.dashboardCompletedCarousel, empty: he.dashboardCompletedCarouselEmpty };
  }
  return { title: he.dashboardPendingCarousel, empty: he.dashboardPendingCarouselEmpty };
}

export default function PendingTasksCarousel({
  queues,
  kind = "pending",
  onOpenTask,
  onOpenStatusAnalysis,
  stageLabels,
}: PendingTasksCarouselProps) {
  const all = useMemo(
    () => (kind === "completed" ? buildCompletedTasks(queues) : buildPendingTasks(queues)),
    [queues, kind],
  );
  const { title, empty } = carouselCopy(kind);
  const [groupMode, setGroupMode] = useState<PendingGroupMode>("assignee");

  const groups = useMemo(
    () => groupPendingTasks(all, groupMode, stageLabels),
    [all, groupMode, stageLabels],
  );

  return (
    <Box
      mb={3}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: EMPLOYEE_CARD_RADIUS,
        p: 2,
        bgcolor: "background.paper",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.05)",
      }}
    >
      <SectionHeading
        title={title}
        count={all.length}
        trailing={
          <>
            <TextField
              select
              size="small"
              label={he.dashboardGroupBy}
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as PendingGroupMode)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="assignee">{he.dashboardGroupByAssignee}</MenuItem>
              <MenuItem value="department">{he.dashboardGroupByDepartment}</MenuItem>
              <MenuItem value="promotion_stage">{he.dashboardGroupByStage}</MenuItem>
            </TextField>
            {onOpenStatusAnalysis && (
              <Button
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={onOpenStatusAnalysis}
                sx={{ minHeight: 40, borderRadius: "12px", fontWeight: 700 }}
              >
                {he.dashboardStatusAnalysis}
              </Button>
            )}
          </>
        }
      />

      {all.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      ) : (
        <Box
          sx={{
            maxHeight: { xs: 320, md: 420 },
            overflowY: "auto",
            pr: 0.5,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "action.disabled",
              borderRadius: 3,
            },
          }}
        >
          {groups.map((group) => (
            <Box key={group.key} mb={2}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                {group.label}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  overflowX: "auto",
                  pb: 1,
                  scrollSnapType: "x mandatory",
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "action.disabled",
                    borderRadius: 3,
                  },
                }}
              >
                {group.tasks.map((task) => (
                  <PendingTaskMediaCard key={task.id} task={task} onOpen={onOpenTask} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
