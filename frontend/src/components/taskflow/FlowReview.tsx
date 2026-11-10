import { Box, ButtonBase, Dialog, Typography } from "@mui/material";
import checkIcon from "../../assets/flow1/icon-check.svg";
import FlowPageHeader from "./FlowPageHeader";
import FlowVideoPlayer from "./FlowVideoPlayer";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import type { TrimRange } from "../../utils/flowTrim";
import type { CaptureLocation, GeoPoint } from "../../utils/geoCheck";
import { allChecksPassed, buildReviewChecks, canSendReview, type ReviewCheck } from "../../utils/flowReview";

type Props = {
  open: boolean;
  title: string;
  previewUrl: string | null | undefined;
  durationSeconds: number | null | undefined;
  minSeconds: number | null | undefined;
  /** Verdict de lumière mesuré pendant le tournage ; null/absent = pas de ligne. */
  lightOk?: boolean | null;
  branch?: string | null;
  /** Coordonnées du snif et GPS du tournage : contrôle « צולם בסניף » réel. */
  branchCenter?: GeoPoint | null;
  location?: CaptureLocation | null;
  capturedAt?: string | null;
  progress?: { done: number; total: number };
  onConfirm: () => void;
  onRetake: () => void;
  /** Découpe la vidéo (bouton « חיתוך ») ; sans elle le bouton n'apparaît pas. */
  onTrim?: (range: TrimRange) => Promise<unknown>;
};

const paperProps = { sx: { background: flowScreenBackground } };

/** Figma « וי » : carré vert 23,4 avec coin haut-gauche de 12 ; orange quand le contrôle n'est pas bon. */
function CheckBadge({ ok }: { ok: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 23.437,
        height: 23.437,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "12px 11.719px 11.719px 11.719px",
        bgcolor: ok ? flowColor.green300 : flowColor.orange300,
      }}
    >
      {ok ? (
        <Box component="img" src={checkIcon} alt="" sx={{ width: 14.915, height: 14.915 }} />
      ) : (
        <Typography component="span" sx={{ ...flowText.label, lineHeight: 1, color: flowColor.navy800 }}>!</Typography>
      )}
    </Box>
  );
}

function CheckRow({ check }: { check: ReviewCheck }) {
  return (
    <Box
      data-testid={`flow-review-${check.id}`}
      data-ok={check.ok ? "true" : "false"}
      sx={{ display: "flex", alignItems: "center", gap: "10.653px" }}
    >
      <CheckBadge ok={check.ok} />
      <Typography sx={{ ...flowText.body, color: flowColor.navy800 }}>{check.text}</Typography>
    </Box>
  );
}

function Checks({ checks }: { checks: ReviewCheck[] }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Typography data-testid="flow-review-heading" sx={{ ...flowText.button, color: flowColor.navy800 }}>
        {allChecksPassed(checks) ? he.flowReviewChecksPassed : he.flowReviewChecksIssues}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </Box>
    </Box>
  );
}

const buttonSx = { height: flowSize.buttonReview, borderRadius: `${flowRadius.sm}px`, p: "11.271px", ...flowText.button } as const;

/** « אישור » (164 × 46, noir ; l'envoi au serveur se fait à l'écran 10) à gauche, « צילום מחדש » (165 × 46, sans fond) à droite. */
function Actions({ canSend, onConfirm, onRetake }: { canSend: boolean; onConfirm: () => void; onRetake: () => void }) {
  return (
    <Box sx={{ direction: "ltr", display: "flex", justifyContent: "flex-end", gap: "16px", width: "100%" }}>
      <ButtonBase
        data-testid="flow-review-confirm"
        disabled={!canSend}
        onClick={onConfirm}
        sx={{ ...buttonSx, width: 164, bgcolor: flowColor.neutral900, color: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.4 } }}
      >
        {he.flowReviewConfirm}
      </ButtonBase>
      <ButtonBase data-testid="flow-review-retake" onClick={onRetake} sx={{ ...buttonSx, width: 165, color: flowColor.neutral900 }}>
        {he.flowReviewRetake}
      </ButtonBase>
    </Box>
  );
}

/**
 * Écran 08 : revue de la vidéo filmée. Contrôles réels uniquement (durée, lumière mesurée, lieu et heure),
 * recalculés après une découpe (bouton « חיתוך » du lecteur).
 */
export default function FlowReview(props: Props) {
  const { open, title, previewUrl, durationSeconds, minSeconds, onConfirm, onRetake } = props;
  const checks = buildReviewChecks({
    durationSeconds,
    minSeconds,
    lightOk: props.lightOk,
    branch: props.branch,
    branchCenter: props.branchCenter,
    location: props.location,
    capturedAt: props.capturedAt,
  });
  return (
    <Dialog open={open} fullScreen dir="rtl" PaperProps={paperProps} disableEnforceFocus>
      <Box
        data-testid="flow-review"
        sx={{ width: "100%", maxWidth: 393, mx: "auto", flex: 1, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "30px", px: "24px", pt: "calc(38px + env(safe-area-inset-top, 0px))", pb: "calc(30px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}
      >
        <FlowPageHeader title={he.flowReviewTitle(title)} titleColor={flowColor.neutral900} progress={props.progress} onBack={onRetake} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <FlowVideoPlayer src={previewUrl} durationSeconds={durationSeconds} onTrim={props.onTrim} />
          <Checks checks={checks} />
        </Box>
        <Box sx={{ flex: 1, minHeight: "18px" }} />
        <Actions canSend={canSendReview(checks)} onConfirm={onConfirm} onRetake={onRetake} />
      </Box>
    </Dialog>
  );
}
