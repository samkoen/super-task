import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { issueReportService, type IssueReport } from "../../services/issueReportService";
import { he } from "../../i18n/he";

function mediaUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "";
  return `${base}${path}`;
}

export default function IssueReportDetailDialog({
  reportId,
  onClose,
}: {
  reportId: string | null;
  onClose: () => void;
}) {
  const [report, setReport] = useState<IssueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    void issueReportService
      .getReport(reportId)
      .then(setReport)
      .catch((e) => setError(e instanceof ApiError ? e.message : he.errorGeneric))
      .finally(() => setLoading(false));
  }, [reportId]);

  const photoSrc = mediaUrl(report?.photo_url ?? null);
  const videoSrc = mediaUrl(report?.video_url ?? null);
  const audioSrc = mediaUrl(report?.audio_url ?? null);

  return (
    <Dialog open={!!reportId} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.issueReportTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
        )}
        {error && <Typography color="error">{error}</Typography>}
        {report && !loading && (
          <>
            <Typography variant="body2" color="text.secondary">
              {he.issueReportFrom}: <strong>{report.reporter_name ?? "—"}</strong>
              {report.branch_name ? ` · ${report.branch_name}` : ""}
            </Typography>
            {report.text && (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{report.text}</Typography>
            )}
            {(photoSrc || videoSrc || audioSrc) && (
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="subtitle2">{he.issueReportMedia}</Typography>
                {photoSrc && (
                  <Box component="img" src={photoSrc} alt="" sx={{ maxWidth: "100%", borderRadius: 1 }} />
                )}
                {videoSrc && (
                  <Box component="video" src={videoSrc} controls sx={{ maxWidth: "100%", borderRadius: 1 }} />
                )}
                {audioSrc && (
                  <Box component="audio" src={audioSrc} controls sx={{ width: "100%" }} />
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{he.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
