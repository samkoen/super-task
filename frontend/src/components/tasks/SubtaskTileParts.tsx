import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import StopIcon from "@mui/icons-material/Stop";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { useVideoPoster } from "../../hooks/useVideoPoster";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_GRADIENT } from "../../styles/employeeUi";
import type { CaptureStepState } from "../../utils/captureProgress";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { SlotFill } from "../../utils/completionSlotView";

export type StepHintControls = {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
};

const SUCCESS = "#2E7D32";

/** Sous-titre d'une étape : « הושלם », ou « הצעד הבא » + durée minimale d'une vidéo. */
export function stepCaption(req: CompletionRequirement, state: CaptureStepState): string {
  if (state === "done") return he.completionSlotDone;
  const parts: string[] = [];
  if (state === "next") parts.push(he.captureStepNext);
  if (req.kind === "video") parts.push(he.completionSlotVideoMin(req.min_seconds ?? 10));
  return parts.join(" · ");
}

export function actionLabel(kind: CompletionRequirement["kind"], filled: boolean): string {
  if (filled) return he.completionRetake;
  if (kind === "video") return he.completionTakeVideo;
  if (kind === "audio") return he.captureTakeAudio;
  return he.completionTakePhoto;
}

export function tileRingSx(state: CaptureStepState) {
  if (state === "done") return { boxShadow: `0 0 0 3px ${SUCCESS}` };
  if (state === "next") return { boxShadow: `0 0 0 3px ${EMPLOYEE_BRAND}, 0 10px 28px rgba(10,107,92,0.28)` };
  return { boxShadow: "0 4px 14px rgba(15,23,42,0.10)" };
}

/** Image du menahel, ou aperçu de ce que l'oved vient de prendre, sous un voile lisible. */
export function TileBackdrop({
  req,
  fill,
  exampleSrc,
  title,
}: {
  req: CompletionRequirement;
  fill: SlotFill | null;
  exampleSrc: string | null;
  title: string;
}) {
  const raw = fill?.previewUrl || fill?.url || null;
  const resolved = useResolvedMediaSrc(raw, Boolean(raw && !raw.startsWith("blob:")));
  const rawPoster = fill?.posterUrl || null;
  const posterMedia = useResolvedMediaSrc(rawPoster, Boolean(rawPoster && !rawPoster.startsWith("blob:")));
  const captured = useVideoPoster(req.kind === "video" && !rawPoster ? resolved.src : null);
  const taken = req.kind === "video" ? posterMedia.src || captured : req.kind === "photo" ? resolved.src : null;
  // Image du menahel : affichage immédiat via le proxy, chargement authentifié en secours (onError).
  const exampleRaw = raw ? null : exampleSrc;
  const example = useResolvedMediaSrc(exampleRaw, false);
  const src = raw ? taken : example.src;
  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, background: EMPLOYEE_BRAND_GRADIENT }}>
      {src ? (
        <Box
          component="img"
          src={src}
          alt={title}
          onError={raw ? undefined : example.onError}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : null}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(6,40,35,0.62) 0%, rgba(0,0,0,0.08) 42%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </Box>
  );
}

function StepBadge({ state, number }: { state: CaptureStepState; number: number }) {
  const done = state === "done";
  return (
    <Box
      aria-hidden
      component="span"
      sx={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        color: done ? "#fff" : EMPLOYEE_BRAND,
        bgcolor: done ? SUCCESS : "#fff",
      }}
    >
      {done ? <CheckRoundedIcon fontSize="small" /> : number}
    </Box>
  );
}

export function TileHeading({
  title,
  index,
  state,
}: {
  title: string;
  index: number;
  state: CaptureStepState;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        insetInline: 16,
        zIndex: 2,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        paddingInlineEnd: "150px",
        textAlign: "start",
      }}
    >
      <StepBadge state={state} number={index + 1} />
      <Box sx={{ minWidth: 0, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}>
        <Typography
          sx={{
            fontSize: "1.25rem",
            fontWeight: 800,
            lineHeight: 1.25,
            overflowWrap: "anywhere",
            // Le titre ne descend jamais sous le bouton « צלם » posé en bas de la tuile.
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

export function ActionPill({ kind, filled, disabled }: { kind: CompletionRequirement["kind"]; filled: boolean; disabled?: boolean }) {
  const Icon = kind === "video" ? VideocamRoundedIcon : kind === "audio" ? MicRoundedIcon : PhotoCameraRoundedIcon;
  return (
    <Box
      component="span"
      sx={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        minHeight: 52,
        px: 2.5,
        borderRadius: 26,
        fontSize: "1.1rem",
        fontWeight: 800,
        color: filled ? SUCCESS : EMPLOYEE_BRAND,
        bgcolor: "#fff",
        opacity: disabled ? 0.6 : 1,
        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
      }}
    >
      <Icon />
      {actionLabel(kind, filled)}
    </Box>
  );
}

const frostedSx = (onDark: boolean) =>
  ({
    width: 42,
    height: 42,
    color: onDark ? "#fff" : EMPLOYEE_BRAND,
    bgcolor: onDark ? "rgba(15,23,42,0.5)" : "rgba(10,107,92,0.1)",
    backdropFilter: onDark ? "blur(6px)" : "none",
    "&:hover": { bgcolor: onDark ? "rgba(15,23,42,0.7)" : "rgba(10,107,92,0.18)" },
  }) as const;

/** Les trois icônes lire / écouter / chat, partagées par les sous-tâches et la tâche. */
export function ToolButtons({
  hintControls,
  onAsk,
  askLabel = he.subtaskAsk,
  onDark = true,
  onHelp,
  helpLabel = he.taskReferenceMediaLabel,
}: {
  hintControls?: StepHintControls;
  onAsk?: () => void;
  askLabel?: string;
  onDark?: boolean;
  /** Icône « ? » : ouvre les ajouts du menahel (image, vidéo, audio d'exemple). */
  onHelp?: () => void;
  helpLabel?: string;
}) {
  const sx = frostedSx(onDark);
  const spinner = hintControls?.loading && !hintControls.speaking;
  return (
    <>
      {hintControls ? (
        <>
          <IconButton aria-label={he.completionShowHint} onClick={hintControls.onShow} sx={sx}>
            {spinner ? <CircularProgress size={18} color="inherit" /> : <SubjectIcon fontSize="small" />}
          </IconButton>
          {hintControls.listenEnabled ? (
            <IconButton
              aria-label={hintControls.speaking ? he.taskListenStop : he.completionListenHint}
              onClick={hintControls.onSpeak}
              sx={sx}
            >
              {hintControls.speaking ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          ) : null}
        </>
      ) : null}
      {onAsk ? (
        <IconButton aria-label={askLabel} onClick={onAsk} sx={sx}>
          <ChatBubbleOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
      {onHelp ? (
        <IconButton aria-label={helpLabel} onClick={onHelp} sx={sx}>
          <HelpOutlineRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </>
  );
}

/** Lire, écouter, poser une question : toujours à portée de pouce, par-dessus la sous-tâche. */
export function TileTools({
  hintControls,
  onAsk,
  onDark = true,
}: {
  hintControls?: StepHintControls;
  onAsk?: () => void;
  onDark?: boolean;
}) {
  return (
    <Box sx={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 3, display: "flex", gap: 0.75 }}>
      <ToolButtons hintControls={hintControls} onAsk={onAsk} onDark={onDark} />
    </Box>
  );
}