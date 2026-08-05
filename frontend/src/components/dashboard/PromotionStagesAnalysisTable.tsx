import {
  Box,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from "@mui/material";
import type { PromotionStage } from "../../services/promotionStageService";
import { he } from "../../i18n/he";

interface PromotionStagesAnalysisTableProps {
  stages: PromotionStage[];
}

export default function PromotionStagesAnalysisTable({
  stages,
}: PromotionStagesAnalysisTableProps) {
  if (stages.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" mb={2}>
        {he.dashboardStagesEmpty}
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
        {he.dashboardStagesAnalysisTitle}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{he.dashboardStageId}</TableCell>
              <TableCell>{he.dashboardStageAssignee}</TableCell>
              <TableCell>{he.dashboardStageLeadProduct}</TableCell>
              <TableCell>{he.dashboardStageStock}</TableCell>
              <TableCell>{he.dashboardStageSignage}</TableCell>
              <TableCell align="center">{he.dashboardStageOpenTasks}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stages.map((stage) => {
              const urgent = stage.urgent || stage.stock_pct < 30;
              return (
                <TableRow key={stage.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{stage.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stage.location_label || stage.department_name || ""}
                    </Typography>
                  </TableCell>
                  <TableCell>{stage.assignee_name || "—"}</TableCell>
                  <TableCell>{stage.lead_product_name || "—"}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box flex={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, Math.max(0, stage.stock_pct))}
                          color={urgent ? "error" : "primary"}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight={urgent ? 800 : 500}>
                        {Math.round(stage.stock_pct)}%
                      </Typography>
                      {urgent && <Chip size="small" color="error" label="!" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {stage.signage_status === "ok"
                      ? he.dashboardStageSignageOk
                      : he.dashboardStageSignageUpdate}
                  </TableCell>
                  <TableCell align="center">{stage.open_tasks ?? 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
