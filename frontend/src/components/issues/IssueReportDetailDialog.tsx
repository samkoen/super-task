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
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

export function issueReportMediaSources(report: Pick<IssueReport, "photo_url" | "video_url" | "audio_url">) {
  return {
    photoSrc: mediaUrl(report.photo_url),
    videoSrc: mediaUrl(report.video_url),
    audioSrc: mediaUrl(report.audio_url),
  };
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

  const { photoSrc, videoSrc, audioSrc } = report
    ? issueReportMediaSources(report)
    : { photoSrc: null, videoSrc: null, audioSrc: null };
  const hasMedia = Boolean(photoSrc || videoSrc || audioSrc);

  return (
    <Dialog open={!!reportId} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.issueReportTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Typography color="error">{error}</Typography>}
        {report && !loading && (
          <>
            <Typography variant="body2" color="text.secondary">
              {he.issueReportFrom}: <strong>{report.reporter_name ?? "—"}</strong>
              {report.branch_name ? ` · ${report.branch_name}` : ""}
            </Typography>
            {report.text ? (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {report.text}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {he.issueReportMediaOnly}
              </Typography>
            )}
            <Box display="flex" flexDirection="column" gap={1.25}>
              <Typography variant="subtitle2" fontWeight={700}>
                {he.issueReportMedia}
              </Typography>
              {!hasMedia && (
                <Typography variant="body2" color="text.secondary">
                  {he.issueReportNoMedia}
                </Typography>
              )}
              {photoSrc && (
                <Box
                  component="img"
                  src={photoSrc}
                  alt={he.issueReportPhoto}
                  sx={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "contain",
                    borderRadius: 1,
                    display: "block",
                    bgcolor: "action.hover",
                  }}
                />
              )}
              {videoSrc && (
                <Box
                  component="video"
                  src={videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  sx={{
                    width: "100%",
                    maxHeight: 360,
                    borderRadius: 1,
                    display: "block",
                    bgcolor: "#000",
                  }}
                />
              )}
              {audioSrc && (
                <Box
                  component="audio"
                  src={audioSrc}
                  controls
                  preload="metadata"
                  sx={{ width: "100%", display: "block" }}
                />
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{he.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
