import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase, TextField, Typography } from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MediaCaptureActions from "../../../media/MediaCaptureActions";
import { useResolvedMediaSrc } from "../../../../hooks/useResolvedMediaSrc";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";
import {
  sanitizeVideoSecondsDraft,
  type CompletionKind,
  type CompletionRequirement,
} from "../../../../utils/completionMedia";
import { stepNumber } from "../../../../utils/flowStack";
import { referenceFileKind } from "../../../../utils/referenceMediaFile";
import StudioSheet from "./StudioSheet";
import { studioFieldSx, studioPrimarySx, studioSecondarySx } from "./studioUi";

const KINDS: CompletionKind[] = ["video", "photo", "audio", "message"];

export function KindIcon({ kind, size = 22 }: { kind: CompletionKind; size?: number }) {
  const sx = { fontSize: size, color: flowColor.navy800 };
  if (kind === "photo") return <PhotoCameraOutlinedIcon sx={sx} />;
  if (kind === "audio") return <MicNoneRoundedIcon sx={sx} />;
  if (kind === "message") return <ChatBubbleOutlineRoundedIcon sx={sx} />;
  return <VideocamOutlinedIcon sx={sx} />;
}

/** Ligne d'action d'une feuille : icône ronde, libellé, sous-texte facultatif. */
function SheetRow({
  icon,
  label,
  hint,
  selected = false,
  danger = false,
  disabled = false,
  testId,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testId?: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: "100%",
        minHeight: 64,
        px: "14px",
        gap: "14px",
        justifyContent: "flex-start",
        textAlign: "right",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: flowColor.neutral100,
        border: `1.5px solid ${selected ? flowColor.navy800 : "transparent"}`,
        "&.Mui-disabled": { opacity: 0.4 },
      }}
    >
      <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", bgcolor: flowColor.neutral0, display: "grid", placeItems: "center" }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ ...flowText.button, fontSize: 16, color: danger ? "#b3261e" : flowColor.neutral900 }}>{label}</Typography>
        {hint ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{hint}</Typography> : null}
      </Box>
      {selected ? <CheckRoundedIcon sx={{ color: flowColor.navy800 }} /> : null}
    </ButtonBase>
  );
}

/** « מה העובד צריך לעשות? » : choix du type d'une carte (ajout ou changement). */
export function StudioKindSheet({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  current?: CompletionKind;
  onPick: (kind: CompletionKind) => void;
  onClose: () => void;
}) {
  return (
    <StudioSheet open={open} title={he.studioKindSheetTitle} onClose={onClose} testId="studio-kind-sheet">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {KINDS.map((kind) => (
          <SheetRow
            key={kind}
            testId={`studio-kind-${kind}`}
            icon={<KindIcon kind={kind} />}
            label={he.studioKindLabels[kind]}
            hint={he.studioKindHints[kind]}
            selected={current === kind}
            onClick={() => onPick(kind)}
          />
        ))}
      </Box>
    </StudioSheet>
  );
}

function MinSecondsField({ seconds, onChange }: { seconds?: number; onChange: (value: string) => void }) {
  const committed = seconds == null ? "" : String(seconds);
  const [draft, setDraft] = useState(committed);
  useEffect(() => setDraft(committed), [committed]);
  return (
    <TextField
      label={he.studioMinSeconds}
      value={draft}
      onChange={(e) => {
        const next = sanitizeVideoSecondsDraft(e.target.value);
        setDraft(next);
        onChange(next);
      }}
      inputProps={{ inputMode: "numeric", pattern: "[0-9]*", dir: "ltr", maxLength: 3, "aria-label": he.studioMinSeconds }}
      sx={studioFieldSx}
      fullWidth
    />
  );
}

/** « ••• » d'une carte : durée minimale (vidéo), type, ordre, suppression. */
export function StudioStepMenuSheet({
  req,
  index,
  count,
  onClose,
  onSeconds,
  onChangeKind,
  onMove,
  onRemove,
}: {
  req: CompletionRequirement | null;
  index: number;
  count: number;
  onClose: () => void;
  onSeconds: (value: string) => void;
  onChangeKind: () => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <StudioSheet
      open={Boolean(req)}
      title={he.studioStepMenu(stepNumber(index))}
      subtitle={req ? he.studioKindLabels[req.kind] : undefined}
      onClose={onClose}
      testId="studio-step-menu"
    >
      {req?.kind === "video" ? <MinSecondsField seconds={req.min_seconds} onChange={onSeconds} /> : null}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <SheetRow icon={<SwapHorizRoundedIcon sx={{ color: flowColor.navy800 }} />} label={he.studioChangeKind} onClick={onChangeKind} />
        <SheetRow
          icon={<ArrowUpwardRoundedIcon sx={{ color: flowColor.navy800 }} />}
          label={he.studioMoveUp}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        />
        <SheetRow
          icon={<ArrowDownwardRoundedIcon sx={{ color: flowColor.navy800 }} />}
          label={he.studioMoveDown}
          disabled={index >= count - 1}
          onClick={() => onMove(1)}
        />
        <SheetRow
          testId="studio-step-delete"
          icon={<DeleteOutlineRoundedIcon sx={{ color: "#b3261e" }} />}
          label={he.studioDeleteStep}
          danger
          onClick={onRemove}
        />
      </Box>
      <ButtonBase onClick={onClose} sx={studioPrimarySx}>
        {he.studioDone}
      </ButtonBase>
    </StudioSheet>
  );
}

function GuidePreview({ url }: { url?: string }) {
  const media = useResolvedMediaSrc(url || null, false);
  if (!url || !media.src) {
    return (
      <Box
        sx={{
          height: 140,
          borderRadius: `${flowRadius.md}px`,
          bgcolor: flowColor.neutral100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <VideoLibraryOutlinedIcon sx={{ fontSize: 36, color: flowColor.alphaNeutral900_60 }} />
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.studioGuideEmpty}</Typography>
      </Box>
    );
  }
  return (
    <Box
      component="video"
      data-testid="studio-guide-preview"
      src={`${media.src}#t=0.1`}
      controls
      preload="metadata"
      playsInline
      onError={media.onError}
      sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral900, display: "block" }}
    />
  );
}

/** « דוגמא לצילום נכון » côté menahel : la vidéo « איך מצלמים » que l'oved ouvrira depuis la carte. */
export function StudioGuideSheet({
  req,
  onPick,
  onClear,
  onClose,
}: {
  req: CompletionRequirement | null;
  onPick: (file: File) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  const title = req?.title?.trim();
  return (
    <StudioSheet
      open={Boolean(req)}
      title={he.studioGuideSheetTitle}
      subtitle={title ? `${title} · ${he.studioGuideSheetHint}` : he.studioGuideSheetHint}
      onClose={onClose}
      testId="studio-guide-sheet"
    >
      <GuidePreview url={req?.guide_video_url} />
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="video/*"
        data-testid="studio-guide-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const ok = referenceFileKind(file) === "video";
          setInvalid(!ok);
          if (ok) onPick(file);
        }}
      />
      <Box sx={{ display: "flex", gap: "10px" }}>
        <ButtonBase onClick={() => inputRef.current?.click()} sx={{ ...studioSecondarySx, flex: 1 }}>
          {he.studioGuidePick}
        </ButtonBase>
        <MediaCaptureActions
          photoAdded={false}
          videoAdded={false}
          audioAdded={false}
          uploadingKind={null}
          allowedKinds={["video"]}
          onCapture={(file) => onPick(file)}
          trigger={(open, ui) => (
            <ButtonBase onClick={open} disabled={ui.disabled} sx={{ ...studioSecondarySx, flex: 1 }}>
              {he.studioGuideCapture}
            </ButtonBase>
          )}
        />
      </Box>
      {invalid ? <Typography sx={{ ...flowText.label, color: "#b3261e" }}>{he.completionGuideVideoInvalid}</Typography> : null}
      {req?.guide_video_url ? (
        <ButtonBase onClick={onClear} sx={{ ...flowText.button, color: "#b3261e", alignSelf: "center", height: 40, px: 2 }}>
          {he.studioGuideRemove}
        </ButtonBase>
      ) : null}
      <ButtonBase onClick={onClose} sx={studioPrimarySx}>
        {he.studioDone}
      </ButtonBase>
    </StudioSheet>
  );
}
