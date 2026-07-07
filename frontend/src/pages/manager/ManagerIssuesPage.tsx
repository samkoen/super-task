import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { issueReportService, type IssueReport } from "../../services/issueReportService";
import IssueReportDetailDialog from "../../components/issues/IssueReportDetailDialog";
import { he } from "../../i18n/he";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ManagerIssuesPage() {
  const [items, setItems] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await issueReportService.listReports();
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={0.5}>{he.managerIssuesTitle}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>{he.managerIssuesSubtitle}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">{he.managerIssuesEmpty}</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{he.issueReportFrom}</TableCell>
              <TableCell>{he.branch}</TableCell>
              <TableCell>{he.issueReportText}</TableCell>
              <TableCell>{he.createdAt}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.reporter_name ?? "—"}</TableCell>
                <TableCell>{item.branch_name ?? "—"}</TableCell>
                <TableCell sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.text || he.issueReportMediaOnly}
                </TableCell>
                <TableCell dir="ltr">{formatWhen(item.created_at)}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => setSelectedId(item.id)}>{he.view}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <IssueReportDetailDialog
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Box>
  );
}
