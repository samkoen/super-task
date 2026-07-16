import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { ApiError } from "../../services/api";
import { issueReportService, type IssueReport } from "../../services/issueReportService";
import IssueReportDetailDialog from "../../components/issues/IssueReportDetailDialog";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useFeedback } from "../../context/FeedbackContext";
import { buildAdHocPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import { formatDueAt } from "../../utils/dateView";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

export default function ManagerIssuesPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const [items, setItems] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IssueReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await issueReportService.listReports();
      setItems(data);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateTask = (report: IssueReport) => {
    navigate("/manager/tasks", {
      state: { adHocPrefillFromIssue: buildAdHocPrefillFromIssue(report) },
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await issueReportService.deleteReport(deleteTarget.id);
      showSuccess(he.issueReportDeleted);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader title={he.managerIssuesTitle} subtitle={he.managerIssuesSubtitle} />

      {loading ? (
        <ListSkeleton variant="table" rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title={he.managerIssuesEmpty}
          description={he.noTasksHint}
          icon={<ReportProblemOutlinedIcon fontSize="inherit" />}
        />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell width={72}>{he.issueReportPhoto}</TableCell>
                <TableCell>{he.issueReportFrom}</TableCell>
                <TableCell>{he.branch}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>{he.issueReportText}</TableCell>
                <TableCell width={120}>{he.createdAt}</TableCell>
                <TableCell align="left" width={140}>
                  {he.actions}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const photoSrc = mediaUrl(item.photo_url);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      {photoSrc ? (
                        <Box
                          component="img"
                          src={photoSrc}
                          alt=""
                          onClick={() => setSelectedId(item.id)}
                          sx={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 1.5,
                            display: "block",
                            cursor: "pointer",
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            bgcolor: "action.hover",
                            display: "grid",
                            placeItems: "center",
                            color: "text.disabled",
                          }}
                        >
                          <ReportProblemOutlinedIcon fontSize="small" />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.reporter_name ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.branch_name ?? "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.text || he.issueReportMediaOnly}
                      </Typography>
                    </TableCell>
                    <TableCell dir="ltr">
                      <Typography variant="caption" color="text.secondary">
                        {formatDueAt(item.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Box display="flex" gap={0.25} justifyContent="flex-start">
                        <Tooltip title={he.view}>
                          <IconButton size="small" onClick={() => setSelectedId(item.id)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={he.issueReportCreateTask}>
                          <IconButton size="small" color="primary" onClick={() => handleCreateTask(item)}>
                            <AddTaskIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={he.issueReportDelete}>
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <IssueReportDetailDialog reportId={selectedId} onClose={() => setSelectedId(null)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} dir="rtl">
        <DialogTitle>{he.issueReportDelete}</DialogTitle>
        <DialogContent>
          <Typography>{he.issueReportDeleteConfirm}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            {he.cancel}
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleConfirmDelete()} disabled={deleting}>
            {he.issueReportDelete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
