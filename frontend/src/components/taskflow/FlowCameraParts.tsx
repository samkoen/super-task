import { Box, ButtonBase, Typography } from "@mui/material";
import directionIcon from "../../assets/flow1/icon-direction.svg";
import recDotIcon from "../../assets/flow1/icon-rec.svg";
import warningIcon from "../../assets/flow1/icon-warning.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { RING_CIRCUMFERENCE, RING_RADIUS, RING_STROKE, recordRing } from "../../utils/flowCamera";
const LTR = { direction: "ltr" } as const;

/** Figma « Dark Icon Button » : 48, navy/800 72 %. */
export function DarkIconButton({ label, icon, disabled, active, onClick }: {
  label: string;
  icon: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      sx={{
        width: 48,
        height: 48,
        borderRadius: "24px",
        bgcolor: active ? flowColor.neutral0 : flowColor.alphaNavy800_72,
        "&.Mui-disabled": { opacity: 0.5 },
      }}
    >
      <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, display: "block", filter: active ? "invert(1)" : "none" }} />
    </ButtonBase>
  );
}

/** Figma « Camera Hint » : consigne du menahel (ligne 1) et durée (ligne 2), flèche à droite. */
export function CameraHint({ text }: { text: string }) {
  return (
    <Box
      data-testid="flow-camera-hint"
      sx={{
        ...LTR,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "16px",
        width: 304,
        maxWidth: "100%",
        boxSizing: "border-box",
        py: "10px",
        pl: "14px",
        pr: "16px",
        borderRadius: "22px",
        bgcolor: flowColor.alphaNavy800_72,
      }}
    >
      <Typography dir="rtl" sx={{ ...flowText.label, color: flowColor.neutral0, textAlign: "right", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
        {text}
      </Typography>
      <Box component="img" src={directionIcon} alt="" sx={{ width: 18, height: 18, flexShrink: 0 }} />
    </Box>
  );
}

/** Figma « Recording Timer » : chrono puis point REC. */
export function RecordingTimer({ clock }: { clock: string }) {
  return (
    <Box
      role="timer"
      data-testid="flow-recording-timer"
      sx={{ ...LTR, display: "flex", alignItems: "center", gap: "8px", px: "14px", py: "8px", borderRadius: "20px", bgcolor: flowColor.alphaNavy800_72 }}
    >
      <Typography sx={{ ...flowText.button, color: flowColor.neutral0, fontVariantNumeric: "tabular-nums" }}>{clock}</Typography>
      <Box component="img" src={recDotIcon} alt="" sx={{ width: 10, height: 10 }} />
    </Box>
  );
}

/** Figma « Motion Warning » : jaune, texte puis triangle. */
export function MotionWarning() {
  return (
    <Box
      role="alert"
      data-testid="flow-motion-warning"
      sx={{ ...LTR, display: "flex", alignItems: "center", gap: "8px", py: "9px", pl: "14px", pr: "12px", borderRadius: "20px", bgcolor: flowColor.yellow300 }}
    >
      <Typography dir="rtl" sx={{ ...flowText.label, color: flowColor.navy800, whiteSpace: "nowrap" }}>
        {he.flowCameraMotionWarning}
      </Typography>
      <Box component="img" src={warningIcon} alt="" sx={{ width: 18, height: 18 }} />
    </Box>
  );
}

function Corner({ sx }: { sx: Record<string, unknown> }) {
  return <Box aria-hidden sx={{ position: "absolute", width: 36, height: 36, borderColor: flowColor.neutral0, borderStyle: "solid", borderWidth: 0, ...sx }} />;
}

/** Figma « Scan Corner » × 4 : cadre de prise de vue (289 px de haut, plus haut pendant l'enregistrement). */
export function ScanFrame({ recording }: { recording: boolean }) {
  const top = recording ? 127 : 160;
  return (
    <Box
      aria-hidden
      data-testid="flow-scan-frame"
      sx={{ position: "absolute", left: 18, right: 17, top, height: 289, maxHeight: `calc(100% - ${top + 200}px)`, minHeight: 120, pointerEvents: "none" }}
    >
      <Corner sx={{ left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: "12px" }} />
      <Corner sx={{ right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: "12px" }} />
      <Corner sx={{ left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: "12px" }} />
      <Corner sx={{ right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: "12px" }} />
    </Box>
  );
}

function RecordingRing({ elapsed, minSeconds }: { elapsed: number; minSeconds: number | null }) {
  const ring = recordRing(elapsed, minSeconds);
  return (
    <Box component="svg" aria-hidden viewBox="0 0 80 80" sx={{ position: "absolute", inset: 0, width: 80, height: 80 }}>
      <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth={RING_STROKE} />
      <circle
        data-testid="flow-record-arc"
        cx="40"
        cy="40"
        r={RING_RADIUS}
        fill="none"
        stroke="#fff"
        strokeWidth={RING_STROKE}
        strokeDasharray={`${ring.arcLength} ${RING_CIRCUMFERENCE}`}
        transform="rotate(-90 40 40)"
      />
      {ring.marker ? <circle data-testid="flow-record-min" cx={ring.marker.x} cy={ring.marker.y} r="4" fill={flowColor.minMarker} /> : null}
      <rect x="25" y="25" width="30" height="30" rx="7" fill={flowColor.rec} />
    </Box>
  );
}

function IdleDot() {
  return (
    <Box
      aria-hidden
      sx={{ position: "absolute", inset: 0, boxSizing: "border-box", border: `5px solid ${flowColor.neutral0}`, borderRadius: `${flowRadius.full}px`, display: "grid", placeItems: "center" }}
    >
      <Box sx={{ width: 56, height: 56, borderRadius: "28px", bgcolor: flowColor.rec }} />
    </Box>
  );
}

/** Figma « Record Button » : Idle = point rouge ; Recording = anneau de progression, repère du minimum, carré d'arrêt. */
export function RecordButton({ recording, elapsed, minSeconds, disabled, onPress }: {
  recording: boolean;
  elapsed: number;
  minSeconds: number | null;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <ButtonBase
      aria-label={recording ? he.mediaCaptureStop : he.mediaCaptureRecord}
      data-testid="flow-record-button"
      data-recording={recording ? "true" : "false"}
      disabled={disabled}
      onClick={onPress}
      sx={{ position: "relative", width: 80, height: 80, borderRadius: "50%", "&.Mui-disabled": { opacity: 0.5 } }}
    >
      {recording ? <RecordingRing elapsed={elapsed} minSeconds={minSeconds} /> : <IdleDot />}
    </ButtonBase>
  );
}
