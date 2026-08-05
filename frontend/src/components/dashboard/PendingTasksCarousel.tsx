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
import { buildPendingTasks } from "../../utils/dashboardCarousels";
import {
  groupPendingTasks,
  type PendingGroupMode,
} from "../../utils/storeStatusAnalysis";
import PendingTaskMediaCard from "./PendingTaskMediaCard";

interface PendingTasksCarouselProps {
  queues: TaskQueues | null | undefined;
  onOpenTask?: (task: TimelineTask) => void;
  onOpenStatusAnalysis?: () => void;
  stageLabels?: Map<string, string>;
}

export default function PendingTasksCarousel({
  queues,
  onOpenTask,
  onOpenStatusAnalysis,
  stageLabels,
}: PendingTasksCarouselProps) {
  const all = useMemo(() => buildPendingTasks(queues), [queues]);
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
        borderRadius: 1,
        p: 1.5,
        bgcolor: "background.paper",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        <Box display="flex" alignItems="baseline" gap={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {he.dashboardPendingCarousel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({all.length})
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
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
              size="small"
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={onOpenStatusAnalysis}
            >
              {he.dashboardStatusAnalysis}
            </Button>
          )}
        </Box>
      </Box>

      {all.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardPendingCarouselEmpty}
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
