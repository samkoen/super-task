import { useRef, useState, type SyntheticEvent } from "react";
import { Box, ButtonBase, Drawer, Typography } from "@mui/material";
import closeIcon from "../../assets/flow1/icon-x.svg";
import playIcon from "../../assets/flow1/icon-play.svg";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../styles/flowTokens";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { formatClipDuration } from "../../utils/flowGuide";

type Props = {
  /** Carte dont on affiche la consigne ; null = fermé. */
  req: CompletionRequirement | null;
  index: number;
  onClose: () => void;
};

const MEDIA_HEIGHT = 140;

function GuideImage({ path, title }: { path: string | null; title: string }) {
  const media = useResolvedMediaSrc(path, false);
  if (!media.src || media.failed) {
    return (
      <Typography data-testid="flow-guide-empty" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>
        {he.flowNoExample}
      </Typography>
    );
  }
  return (
    <Box
      component="img"
      data-testid="flow-guide-image"
      src={media.src}
      alt={title}
      onError={media.onError}
      sx={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

function PlayBadge() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 56,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${flowRadius.xl2}px`,
        bgcolor: flowColor.alphaNeutral0_80,
      }}
    >
      <Box component="img" src={playIcon} alt="" sx={{ width: 24, height: 24 }} />
    </Box>
  );
}

function DurationPill({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Typography
      data-testid="flow-guide-duration"
      sx={{
        ...flowText.button,
        position: "absolute",
        right: 7,
        bottom: 13,
        px: "10px",
        py: "4px",
        borderRadius: `${flowRadius.full}px`,
        bgcolor: flowColor.alphaNavy800_72,
        color: flowColor.neutral0,
        direction: "ltr",
      }}
    >
      {text}
    </Typography>
  );
}

/** Lecteur de la vidéo « איך מצלמים » du menahel : affiche l'affiche + lecture au clic. */
function GuideVideo({ path, poster, title }: { path: string; poster: string | null; title: string }) {
  const media = useResolvedMediaSrc(path, false);
  const posterMedia = useResolvedMediaSrc(poster, false);
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  if (!media.src || media.failed) return <GuideImage path={null} title={title} />;
  const play = () => {
    setPlaying(true);
    void ref.current?.play?.();
  };
  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: flowColor.navy800 }}>
      <Box
        component="video"
        ref={ref}
        data-testid="flow-guide-video"
        src={`${media.src}#t=0.1`}
        poster={posterMedia.src || undefined}
        controls={playing}
        preload="auto"
        playsInline
        onError={media.onError}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) => setDuration(e.currentTarget.duration)}
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {playing ? null : <PlayOverlay duration={duration} onPlay={play} />}
    </Box>
  );
}

function PlayOverlay({ duration, onPlay }: { duration: number | null; onPlay: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-guide-play"
      aria-label={he.flowGuidePlay}
      onClick={onPlay}
      sx={{ position: "absolute", inset: 0, bgcolor: flowColor.alphaNavy800_18 }}
    >
      <Box aria-hidden sx={{ position: "absolute", inset: 0, bgcolor: flowColor.alphaNeutral0_19 }} />
      <PlayBadge />
      <DurationPill text={formatClipDuration(duration)} />
    </ButtonBase>
  );
}

function GuideMedia({ req, title }: { req: CompletionRequirement | null; title: string }) {
  const video = req?.guide_video_url || null;
  return (
    <>
      {video ? (
        <Typography sx={{ ...flowText.bodyLarge, color: flowColor.navy800 }}>{he.flowGuideVideoLabel}</Typography>
      ) : null}
      <Box
        sx={{
          height: video ? MEDIA_HEIGHT : 213,
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: `${flowRadius.md}px`,
          bgcolor: flowColor.alphaNeutral1000_10,
        }}
      >
        {video ? (
          <GuideVideo path={video} poster={req?.example_url || null} title={title} />
        ) : (
          <GuideImage path={req?.example_url || null} title={title} />
        )}
      </Box>
    </>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Typography
        component="h2"
        data-testid="flow-guide-heading"
        sx={{ ...flowText.h2, flex: 1, color: flowColor.navy800, textAlign: "right" }}
      >
        {he.flowGuideSheetHeading(title)}
      </Typography>
      <ButtonBase
        data-testid="flow-guide-x"
        aria-label={he.flowGuideClose}
        onClick={onClose}
        sx={{ width: 48, height: 48, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 }}
      >
        <Box component="img" src={closeIcon} alt="" sx={{ width: 24, height: 24 }} />
      </ButtonBase>
    </Box>
  );
}

/**
 * Écran 02 : bottom sheet « איך מצלמים … ». Consigne du menahel, puis sa vidéo d'exemple
 * (`guide_video_url`) ; à défaut, l'image d'exemple (`example_url`).
 */
export default function FlowGuideSheet({ req, index, onClose }: Props) {
  const title = req ? slotDisplayTitle(req, index) : "";
  const hint = (req?.hint || "").trim();
  return (
    <Drawer
      anchor="bottom"
      open={Boolean(req)}
      onClose={onClose}
      // L'écran de tâche est un Dialog plein écran (z-index « modal ») : un Drawer (« drawer » < « modal ») s'ouvrirait derrière.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      PaperProps={{
        dir: "rtl",
        "aria-label": he.flowGuideSheetTitle,
        sx: {
          maxWidth: 393,
          mx: "auto",
          px: `${flowSize.contentPaddingX}px`,
          pt: "12px",
          pb: "24px",
          gap: "16px",
          display: "flex",
          flexDirection: "column",
          bgcolor: flowColor.neutral0,
          borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
        },
      }}
    >
      <Box aria-hidden sx={{ alignSelf: "center", width: 40, height: 5, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.line }} />
      <SheetHeader title={title} onClose={onClose} />
      {hint ? (
        <Typography data-testid="flow-guide-hint" sx={{ ...flowText.body, color: flowColor.neutral900 }}>
          {hint}
        </Typography>
      ) : null}
      <GuideMedia req={req} title={title} />
      <ButtonBase
        data-testid="flow-guide-close"
        onClick={onClose}
        sx={{
          height: 56,
          borderRadius: `${flowRadius.sm}px`,
          bgcolor: flowColor.neutral900,
          color: flowColor.neutral0,
          fontFamily: "'Heebo', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          lineHeight: "24px",
        }}
      >
        {he.flowGuideUnderstood}
      </ButtonBase>
    </Drawer>
  );
}