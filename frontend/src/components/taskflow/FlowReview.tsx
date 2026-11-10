import { Box, ButtonBase, Dialog, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../styles/flowTokens";
import { checkVideoLength } from "../../utils/flowReview";

type Props = {
  open: boolean;
  title: string;
  previewUrl: string | null | undefined;
  durationSeconds: number | null | undefined;
  minSeconds: number | null | undefined;
  onConfirm: () => void;
  onRetake: () => void;
};

function LengthRow({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CheckCircleRoundedIcon : ErrorOutlineRoundedIcon;
  return (
    <Box
      data-testid="flow-review-length"
      data-ok={ok ? "true" : "false"}
      sx={{ display: "flex", alignItems: "center", gap: 1, color: flowColor.neutral0 }}
    >
      <Icon sx={{ fontSize: 20, color: ok ? flowColor.green300 : flowColor.orange300 }} />
      <Typography sx={flowText.label}>{text}</Typography>
    </Box>
  );
}

/**
 * Écran 08 : revue de la vidéo filmée. Un seul contrôle réel : la durée (`min_seconds`).
 * Pas de découpe, pas de lumière ni GPS tant qu'ils ne sont pas réels.
 */
export default function FlowReview({ open, title, previewUrl, durationSeconds, minSeconds, onConfirm, onRetake }: Props) {
  const length = checkVideoLength(durationSeconds, minSeconds);
  const text = length.ok
    ? he.flowReviewLengthOk(length.seconds)
    : he.flowReviewTooShort(length.seconds, length.min ?? 0);
  return (
    <Dialog open={open} fullScreen dir="rtl" PaperProps={{ sx: { bgcolor: flowColor.neutral900 } }} disableEnforceFocus>
      <Box sx={{ maxWidth: 393, width: "100%", mx: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 2, p: 3, pt: "calc(24px + env(safe-area-inset-top, 0px))" }}>
        <Typography component="h2" sx={{ ...flowText.h1, color: flowColor.neutral0 }}>
          {he.flowReviewTitle}
        </Typography>
        <Typography sx={{ ...flowText.bodyLarge, color: flowColor.alphaNeutral0_80 }}>{title}</Typography>
        <Box
          component="video"
          data-testid="flow-review-video"
          src={previewUrl ?? undefined}
          controls
          playsInline
          sx={{ width: "100%", flex: 1, minHeight: 0, maxHeight: "60dvh", borderRadius: `${flowRadius.xl2}px`, bgcolor: "#000", objectFit: "contain" }}
        />
        <LengthRow ok={length.ok} text={text} />
        <ButtonBase
          data-testid="flow-review-confirm"
          disabled={!length.ok}
          onClick={onConfirm}
          sx={{ height: flowSize.buttonReview, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.orange500, color: flowColor.neutral0, ...flowText.button, "&.Mui-disabled": { opacity: 0.4 } }}
        >
          {he.flowReviewConfirm}
        </ButtonBase>
        <ButtonBase
          data-testid="flow-review-retake"
          onClick={onRetake}
          sx={{ height: flowSize.buttonReview, borderRadius: `${flowRadius.md}px`, color: flowColor.neutral0, border: `1px solid ${flowColor.alphaNeutral0_80}`, ...flowText.button }}
        >
          {he.flowReviewRetake}
        </ButtonBase>
      </Box>
    </Dialog>
  );
}
