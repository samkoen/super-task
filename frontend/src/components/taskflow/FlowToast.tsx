import { useEffect } from "react";
import { Box, Snackbar, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { flowToastContent, type FlowToastState } from "../../utils/flowToast";
import { withSystemTopInsetCss } from "../../utils/systemInsets";

const TOAST_MS = 3500;

type Props = { toast: FlowToastState | null; onClose: () => void; durationMs?: number };

const toneStyle = {
  success: { Icon: CheckRoundedIcon, bg: flowColor.green300, fg: flowColor.green700 },
  pending: { Icon: CloudOutlinedIcon, bg: flowColor.yellow300, fg: flowColor.navy800 },
  error: { Icon: ErrorOutlineRoundedIcon, bg: flowColor.neutral300, fg: flowColor.navy800 },
} as const;

/** Toast 09 « נשמר • נשארו עוד 2 משימות » (réseau là) ou 09ב « הסרטון נשמר במכשיר » (sans réseau), sur une ligne. */
export default function FlowToast({ toast, onClose, durationMs = TOAST_MS }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  const content = toast ? flowToastContent(toast) : null;
  const style = content ? toneStyle[content.tone] : toneStyle.success;
  return (
    <Snackbar open={Boolean(toast)} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ top: `${withSystemTopInsetCss("72px")} !important` }}>
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
        <Typography component="p" sx={{ ...flowText.button, maxWidth: "calc(100vw - 96px)", overflowWrap: "anywhere" }}>
          <span data-testid="flow-toast-title">{content?.title}</span>
          {content?.subtitle ? (
            <>
              {" • "}
              <span data-testid="flow-toast-subtitle">{content.subtitle}</span>
            </>
          ) : null}
        </Typography>
      </Box>
    </Snackbar>
  );
}
