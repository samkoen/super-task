import { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import { he } from "../../i18n/he";
import { formatRecordingClock } from "../../utils/captureProgress";

/** Message lisible pour un code d'erreur de capture. */
export function captureErrorMessage(error: string): string {
  if (error === "permission") return he.mediaCapturePermission;
  if (error === "device") return he.mediaCaptureDevice;
  if (error === "unsupported") return he.mediaCaptureUnsupported;
  if (error === "unknown") return he.mediaCaptureUnknown;
  return "";
}

export function scheduleAfterDialogPaint(run: () => void) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  run();
}

export function useBlobPreviewUrl(blob: Blob | null) {
  const previewUrl = useMemo(
    () => (blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
    [blob],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  return previewUrl;
}

const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

/** Pastille rouge « enregistrement en cours » + chronomètre en gros chiffres. */
export function RecordingClock({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <Box
      role="timer"
      aria-live="off"
      data-testid="recording-clock"
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25 }}
    >
      <Box
        aria-hidden
        sx={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          bgcolor: "error.main",
          animation: `${pulse} 1.2s ease-in-out infinite`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      />
      <Typography
        component="span"
        dir="ltr"
        sx={{ fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
      >
        {formatRecordingClock(elapsedSeconds)}
      </Typography>
    </Box>
  );
}

/** Consigne centrée au-dessus de la caméra : une phrase, grosse, qui change selon l'étape. */
export function CaptureInstruction({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "success" | "danger";
}) {
  const color =
    tone === "success" ? "success.dark" : tone === "danger" ? "error.main" : "text.primary";
  return (
    <Typography
      variant="body1"
      textAlign="center"
      fontWeight={700}
      sx={{ color, fontSize: "1.1rem" }}
    >
      {children}
    </Typography>
  );
}

export function recordingFrameSx(recording: boolean) {
  return {
    borderRadius: "18px",
    overflow: "hidden",
    border: `4px solid ${recording ? alpha("#D32F2F", 0.9) : "transparent"}`,
    transition: "border-color 0.2s",
  } as const;
}
