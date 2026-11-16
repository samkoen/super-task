import { ButtonBase, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import { formatTime } from "../../../utils/dashboardTime";
import type { OwnTasksSummary } from "../../../utils/managerHome";

type Props = { summary: OwnTasksSummary; onOpen: () => void };

/**
 * Ligne compacte des tâches du menahel snif lui-même (décision du 16.11) : elle ouvre son FLOW oved.
 * Orange quand l'une est en retard.
 */
export default function ManagerOwnTasksLine({ summary, onOpen }: Props) {
  return (
    <ButtonBase
      data-testid="manager-own-tasks"
      data-late={summary.late ? "true" : "false"}
      onClick={onOpen}
      sx={{
        width: "100%",
        justifyContent: "space-between",
        gap: 1,
        px: "20px",
        py: "14px",
        borderRadius: `${flowRadius.full}px`,
        bgcolor: summary.late ? flowColor.orange500 : flowColor.neutral0,
      }}
    >
      <Typography sx={{ ...flowText.button, color: flowColor.neutral900 }}>
        {he.managerHomeOwnTasks(summary.open, summary.nextAt ? formatTime(summary.nextAt) : "")}
      </Typography>
      <ChevronLeftRoundedIcon sx={{ color: flowColor.neutral900 }} />
    </ButtonBase>
  );
}
