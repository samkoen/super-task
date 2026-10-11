import { Box, Button, Typography } from "@mui/material";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";
import {
  appendExtraMedia,
  canAddExtraMedia,
  removeExtraMedia,
  type ExtraSlot,
} from "../../utils/extraCompletionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";

export default function ExtraCompletionMedia({
  extras,
  onChange,
  disabled = false,
  onAnnotatingChange,
  hideTitle = false,
  hideActions = false,
}: {
  extras: ExtraSlot[];
  onChange: (next: ExtraSlot[]) => void;
  disabled?: boolean;
  onAnnotatingChange?: (busy: boolean) => void;
  hideTitle?: boolean;
  hideActions?: boolean;
}) {
  const canAdd = canAddExtraMedia(extras);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {hideTitle ? null : (
        <Typography sx={{ fontSize: "1.05rem", fontWeight: 800 }}>{he.extraCompletionTitle}</Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {canAdd ? he.extraCompletionHint : he.extraCompletionLimit}
      </Typography>
      {hideActions ? null : (
        <ExtraCaptureActions
          extras={extras}
          disabled={disabled || !canAdd}
          onChange={onChange}
          onAnnotatingChange={onAnnotatingChange}
        />
      )}
      <ExtraMediaList extras={extras} disabled={disabled} onChange={onChange} />
    </Box>
  );
}

function ExtraCaptureActions({
  extras,
  disabled,
  onChange,
  onAnnotatingChange,
}: {
  extras: ExtraSlot[];
  disabled: boolean;
  onChange: (next: ExtraSlot[]) => void;
  onAnnotatingChange?: (busy: boolean) => void;
}) {
  return (
    <MediaCaptureActions
      prominent
      quiet
      photoAdded={false}
      videoAdded={false}
      audioAdded={false}
      uploadingKind={null}
      disabled={disabled}
      onAnnotatingChange={onAnnotatingChange}
      onCapture={(file, kind, meta) =>
        onChange(appendExtraMedia(extras, kind, file, meta?.durationSeconds))
      }
    />
  );
}

function ExtraMediaList({
  extras,
  disabled,
  onChange,
}: {
  extras: ExtraSlot[];
  disabled: boolean;
  onChange: (next: ExtraSlot[]) => void;
}) {
  return (
    <>
      {extras.map((item, index) => (
        <ExtraMediaRow
          key={`${item.kind}-${item.media.previewUrl || item.media.keptUrl}-${index}`}
          item={item}
          disabled={disabled}
          onRemove={() => onChange(removeExtraMedia(extras, index))}
        />
      ))}
    </>
  );
}

function ExtraMediaRow({
  item,
  disabled,
  onRemove,
}: {
  item: ExtraSlot;
  disabled: boolean;
  onRemove: () => void;
}) {
  const src = extraPreviewSrc(item.media);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {extraKindLabel(item.kind)}
      </Typography>
      {src ? <ExtraMediaBody kind={item.kind} src={src} /> : null}
      <Button color="inherit" disabled={disabled} onClick={onRemove} sx={{ mt: 0.5, minHeight: 44, fontWeight: 700 }}>
        {he.removeMedia}
      </Button>
    </Box>
  );
}

function extraKindLabel(kind: ExtraSlot["kind"]): string {
  if (kind === "video") return he.completionReqVideo;
  if (kind === "audio") return he.completionReqAudio;
  return he.completionReqPhoto;
}

function extraPreviewSrc(media: PendingMedia): string | null {
  if (media.previewUrl) return media.previewUrl;
  return mediaUrl(media.keptUrl ?? null);
}

function ExtraMediaBody({ kind, src }: { kind: ExtraSlot["kind"]; src: string }) {
  if (kind === "photo") {
    return (
      <Box
        component="img"
        src={src}
        alt={he.completionReqPhoto}
        sx={{ maxWidth: "100%", maxHeight: 160, borderRadius: 1, display: "block" }}
      />
    );
  }
  if (kind === "video") {
    return (
      <Box
        component="video"
        src={src}
        controls
        sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: 1, display: "block" }}
      />
    );
  }
  return <Box component="audio" src={src} controls sx={{ width: "100%" }} />;
}
