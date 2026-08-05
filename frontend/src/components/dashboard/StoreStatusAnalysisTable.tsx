import { Fragment, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { TeamMember, TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import {
  STATUS_ANALYSIS_COLUMNS,
  buildStatusAnalysisRows,
  sumStatusAnalysis,
  type StatusAnalysisColumn,
} from "../../utils/storeStatusAnalysis";
import PendingTaskMediaCard from "./PendingTaskMediaCard";

interface StoreStatusAnalysisTableProps {
  team: TeamMember[] | null | undefined;
  onOpenTask?: (task: TimelineTask) => void;
  onClose?: () => void;
}

interface ExpandedCell {
  userId: string;
  column: StatusAnalysisColumn;
}

const COLUMN_LABELS: Record<StatusAnalysisColumn, () => string> = {
  awaiting_response: () => he.dashboardAnalysisColQuestion,
  pending: () => he.dashboardAnalysisColPending,
  in_progress: () => he.dashboardAnalysisColInProgress,
  pending_review: () => he.dashboardAnalysisColReview,
  completed_today: () => he.dashboardAnalysisColDone,
};

export default function StoreStatusAnalysisTable({
  team,
  onOpenTask,
  onClose,
}: StoreStatusAnalysisTableProps) {
  const rows = useMemo(() => buildStatusAnalysisRows(team), [team]);
  const totals = useMemo(() => sumStatusAnalysis(rows), [rows]);
  const [expanded, setExpanded] = useState<ExpandedCell | null>(null);

  const handleDblClick = (userId: string, column: StatusAnalysisColumn, count: number) => {
    if (count <= 0) return;
    setExpanded((prev) =>
      prev?.userId === userId && prev.column === column ? null : { userId, column },
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {he.dashboardStatusAnalysisTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {he.dashboardStatusAnalysisHint}
          </Typography>
        </Box>
        {onClose && (
          <Button size="small" startIcon={<CloseIcon />} onClick={onClose}>
            {he.close}
          </Button>
        )}
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardStaffOverviewEmpty}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.dashboardAnalysisColEmployee}</TableCell>
                {STATUS_ANALYSIS_COLUMNS.map((col) => (
                  <TableCell key={col} align="center">
                    {COLUMN_LABELS[col]()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isOpen = expanded?.userId === row.userId;
                const openCol = isOpen ? expanded!.column : null;
                const detailTasks = openCol ? row.tasksByColumn[openCol] : [];
                return (
                  <Fragment key={row.userId}>
                    <TableRow hover>
                      <TableCell>
                        <Typography fontWeight={700}>{row.fullName}</Typography>
                        {row.jobFunction && (
                          <Typography variant="caption" color="text.secondary">
                            {row.jobFunction}
                          </Typography>
                        )}
                      </TableCell>
                      {STATUS_ANALYSIS_COLUMNS.map((col) => {
                        const count = row.counts[col];
                        const active = isOpen && openCol === col;
                        return (
                          <TableCell
                            key={col}
                            align="center"
                            onDoubleClick={() => handleDblClick(row.userId, col, count)}
                            sx={{
                              cursor: count > 0 ? "pointer" : "default",
                              fontWeight: count > 0 ? 700 : 400,
                              bgcolor: active ? "action.selected" : undefined,
                              userSelect: "none",
                            }}
                            title={count > 0 ? he.dashboardStatusAnalysisHint : undefined}
                          >
                            {count}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {isOpen && openCol && (
                      <TableRow>
                        <TableCell colSpan={STATUS_ANALYSIS_COLUMNS.length + 1} sx={{ bgcolor: "action.hover" }}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" fontWeight={700}>
                              {he.dashboardAnalysisDetail(
                                row.fullName,
                                COLUMN_LABELS[openCol](),
                                detailTasks.length,
                              )}
                            </Typography>
                            <Button size="small" onClick={() => setExpanded(null)}>
                              {he.dashboardAnalysisCloseDetail}
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              overflowX: "auto",
                              pb: 1,
                            }}
                          >
                            {detailTasks.map((task) => (
                              <PendingTaskMediaCard
                                key={task.id}
                                task={task}
                                onOpen={onOpenTask}
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              <TableRow>
                <TableCell>
                  <Typography fontWeight={800}>{he.dashboardAnalysisTeamTotal}</Typography>
                </TableCell>
                {STATUS_ANALYSIS_COLUMNS.map((col) => (
                  <TableCell key={col} align="center" sx={{ fontWeight: 800 }}>
                    {totals.counts[col]}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
