import { useEffect } from "react";
import { Box, Snackbar, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { flowToastContent, type FlowToastState } from "../../utils/flowToast";

const TOAST_MS = 3500;

type Props = { toast: FlowToastState | null; onClose: () => void; durationMs?: number };

const toneStyle = {
  success: { Icon: CheckRoundedIcon, bg: flowColor.green300, fg: flowColor.green700 },
  pending: { Icon: CloudOffRoundedIcon, bg: flowColor.orange300, fg: flowColor.navy800 },
  error: { Icon: ErrorOutlineRoundedIcon, bg: flowColor.neutral300, fg: flowColor.navy800 },
} as const;

/** Toast 09 « נשלח » ou 09b « נשמר במכשיר », en haut de l'écran sous l'en-tête. */
export default function FlowToast({ toast, onClose, durationMs = TOAST_MS }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  const content = toast ? flowToastContent(toast) : null;
  const style = content ? toneStyle[content.tone] : toneStyle.success;
  return (
    <Snackbar open={Boolean(toast)} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ top: "calc(72px + env(safe-area-inset-top, 0px)) !important" }}>
      <Box
        role="status"
        data-testid="flow-toast"
        data-tone={content?.tone}
        dir="rtl"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          minWidth: 240,
          borderRadius: `${flowRadius.md}px`,
          bgcolor: flowColor.neutral900,
          color: flowColor.neutral0,
          boxShadow: "0 8px 24px rgba(17,21,29,0.25)",
        }}
      >
        <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: style.bg, flexShrink: 0 }}>
          <style.Icon sx={{ fontSize: 18, color: style.fg }} />
        </Box>
        <Box>
          <Typography data-testid="flow-toast-title" sx={flowText.button}>{content?.title}</Typography>
          {content?.subtitle ? (
            <Typography data-testid="flow-toast-subtitle" sx={{ ...flowText.caption, color: flowColor.alphaNeutral0_80 }}>
              {content.subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Snackbar>
  );
}
