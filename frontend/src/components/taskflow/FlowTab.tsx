import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import dotsIcon from "../../assets/flow1/dots.svg";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { flowMaskSx, flowShape } from "../../styles/flowShapes";
import { flowColor, flowRadius, flowSize, flowText, flowToneColor, type FlowTone } from "../../styles/flowTokens";
import { stepNumber, tabStatusText } from "../../utils/flowStack";
import type { SlotUiState } from "../../utils/slotUploadState";

/**
 * Les onglets s'élargissent vers la carte active : 315 px près d'elle, 272 px pour le plus éloigné
 * (carte de 345 px dans le Figma).
 */
export type TabVariant = "wide" | "narrow";

function tabWidthPercent(variant: TabVariant): string {
  const width = variant === "narrow" ? flowSize.tabNarrowWidth : flowSize.tabWideWidth;
  return `${(width / flowSize.cardWidth) * 100}%`;
}

type TabProps = {
  index: number;
  title: string;
  state: SlotUiState;
  tone: FlowTone;
  variant: TabVariant;
  /** Touche un onglet à venir (change la carte active) ou un envoi en échec (renvoi). */
  onSelect?: () => void;
  zIndex: number;
};

/** Vignette de la vidéo (40 × 26) avec le petit triangle lecture du Figma. */
function Thumbnail({ state }: { state: SlotUiState }) {
  const source = state.posterUrl || state.previewUrl || state.url || null;
  const media = useResolvedMediaSrc(source, false);
  const isVideoFrame = !state.posterUrl && state.kind === "video";
  return (
    <Box
      data-testid="flow-tab-thumb"
      sx={{
        position: "relative",
        width: 40,
        height: 26,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: `${flowRadius.xs}px`,
        bgcolor: flowColor.neutral300,
      }}
    >
      {media.src && isVideoFrame ? (
        <Box component="video" src={`${media.src}#t=0.1`} muted preload="metadata" playsInline
          sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {media.src && !isVideoFrame ? (
        <Box component="img" src={media.src} alt="" onError={media.onError}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {state.kind === "video" ? (
        <PlayArrowRoundedIcon sx={{ position: "absolute", top: 8, left: 15, fontSize: 10, color: flowColor.neutral0 }} />
      ) : null}
    </Box>
  );
}

function StatusBadge({ state }: { state: SlotUiState }) {
  const sent = state.status === "sent";
  const Icon = sent ? CheckRoundedIcon : state.status === "failed" ? ErrorOutlineRoundedIcon : ScheduleRoundedIcon;
  return (
    <Box
      data-testid="flow-tab-badge"
      data-status={state.status}
      sx={{
        width: 23.4,
        height: 23.4,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        bgcolor: sent ? flowColor.green300 : flowColor.neutral300,
        borderRadius: `${flowRadius.sm}px 11.7px 11.7px 11.7px`,
      }}
    >
      <Icon sx={{ fontSize: 15, color: sent ? flowColor.green700 : flowColor.navy800 }} />
    </Box>
  );
}

/** Onglet d'une carte déjà remise : vignette, « נשלח 06:43 » (ou « ממתין להעלאה »), coche. */
export function FlowDoneTab({ index, state, variant, onSelect, zIndex }: Omit<TabProps, "title" | "tone">) {
  const failed = state.status === "failed";
  return (
    <ButtonBase
      data-testid="flow-tab-done"
      data-status={state.status}
      data-index={index}
      data-variant={variant}
      disabled={!failed}
      onClick={onSelect}
      sx={{
        zIndex,
        width: tabWidthPercent(variant),
        height: flowSize.tabDoneHeight,
        mb: `-${flowSize.tabOverlap}px`,
        pt: "16px",
        pb: "24px",
        px: "27px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: flowColor.neutral0,
        borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
        "&.Mui-disabled": { opacity: 1 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "23px", minWidth: 0 }}>
        <Thumbnail state={state} />
        <Typography sx={{ ...flowText.caption, color: flowColor.navy800, whiteSpace: "nowrap" }}>
          {tabStatusText(state)}
        </Typography>
      </Box>
      <StatusBadge state={state} />
    </ButtonBase>
  );
}

/** Silhouette du Figma (« bg-shape ») : seul le bas arrondi dépasse sous la carte. */
function TabShape({ tone, variant }: { tone: FlowTone; variant: TabVariant }) {
  const narrow = variant === "narrow";
  return (
    <Box
      aria-hidden
      data-testid="flow-tab-shape"
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: narrow ? 143.086 : 181.514,
        bgcolor: flowToneColor[tone].tab,
        ...flowMaskSx(narrow ? flowShape.tabNarrow : flowShape.tab),
      }}
    />
  );
}

/** Onglet d'une carte encore à faire : « ••• » à gauche, « 03 · titre » à droite, sur la teinte de la carte. */
export function FlowNextTab({ index, title, tone, variant, onSelect, zIndex }: Omit<TabProps, "state">) {
  const narrow = variant === "narrow";
  return (
    <ButtonBase
      data-testid="flow-tab-next"
      data-index={index}
      data-variant={variant}
      onClick={onSelect}
      sx={{
        zIndex,
        position: "relative",
        overflow: "hidden",
        direction: "ltr",
        width: tabWidthPercent(variant),
        height: narrow ? flowSize.tabNarrowHeight : flowSize.tabWideHeight,
        mt: `-${flowSize.tabOverlap}px`,
        pt: `${flowSize.tabOverlap}px`,
        pl: narrow ? "29px" : "26px",
        pr: narrow ? "29px" : "25px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <TabShape tone={tone} variant={variant} />
      <Box component="img" data-testid="flow-tab-dots" src={dotsIcon} alt="" sx={{ position: "relative", width: 19, height: 4.724, flexShrink: 0 }} />
      <Typography
        dir="auto"
        sx={{
          ...flowText.label,
          position: "relative",
          minWidth: 0,
          textAlign: "right",
          color: flowColor.alphaNeutral900_66,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {stepNumber(index)} · {title}
      </Typography>
    </ButtonBase>
  );
}
