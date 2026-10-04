import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import CompletionExampleDialog from "./CompletionExampleDialog";
import CompletionHintDialog from "./CompletionHintDialog";
import CompletionSlotHintButtons from "./CompletionSlotHintButtons";
import CompletionSlotTile from "./CompletionSlotTile";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { useSlotHintPlayback } from "../../hooks/useSlotHintPlayback";
import { countVisualKinds, MAX_MESSAGE_TEXT, type CompletionRequirement } from "../../utils/completionMedia";
import {
  filledVisualCount,
  slotDisplayTitle,
  slotFillSrc,
  slotGuideText,
  visualSlotCount,
  type SlotFill,
} from "../../utils/completionSlotView";

export default function CompletionSlotGrid({
  requirements,
  fills,
  interactive = false,
  disabled = false,
  language = "he",
  onCapture,
  onMessage,
  onAnnotatingChange,
  onMarkPhoto,
  markedPhotoUrls,
}: {
  requirements: CompletionRequirement[];
  fills: Array<SlotFill | null>;
  interactive?: boolean;
  disabled?: boolean;
  language?: EmployeeLanguage;
  onCapture?: (index: number, file: File, durationSeconds?: number) => void;
  onMessage?: (index: number, text: string) => void;
  onAnnotatingChange?: (busy: boolean) => void;
  onMarkPhoto?: (url: string) => void;
  markedPhotoUrls?: string[];
}) {
  const [preview, setPreview] = useState<{ src: string; title: string; kind: "photo" | "video" } | null>(null);
  const hints = useSlotHintPlayback(language);
  const visualCount = visualSlotCount(requirements);
  if (!requirements.length) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {visualCount > 0 && (
        <VisualSlotHeader requirements={requirements} fills={fills} visualCount={visualCount} />
      )}
      {visualCount > 0 && (
        <VisualSlotList
          requirements={requirements}
          fills={fills}
          interactive={interactive}
          disabled={disabled}
          onCapture={onCapture}
          onAnnotatingChange={onAnnotatingChange}
          onMarkPhoto={onMarkPhoto}
          markedPhotoUrls={markedPhotoUrls}
          onEnlarge={(src, title, kind) => setPreview({ src, title, kind: kind ?? "photo" })}
          hints={hints}
        />
      )}
      <NonVisualSlots
        requirements={requirements}
        fills={fills}
        interactive={interactive}
        disabled={disabled}
        onCapture={onCapture}
        onMessage={onMessage}
        hints={hints}
      />
      <CompletionExampleDialog
        src={preview?.src ?? null}
        title={preview?.title ?? ""}
        kind={preview?.kind}
        onClose={() => setPreview(null)}
      />
      {hints.dialog && (
        <CompletionHintDialog
          title={hints.dialog.title}
          text={hints.dialog.text}
          onClose={hints.closeDialog}
        />
      )}
    </Box>
  );
}

function NonVisualSlots({
  requirements,
  fills,
  interactive,
  disabled,
  onCapture,
  onMessage,
  hints,
}: {
  requirements: CompletionRequirement[];
  fills: Array<SlotFill | null>;
  interactive: boolean;
  disabled: boolean;
  onCapture?: (index: number, file: File, durationSeconds?: number) => void;
  onMessage?: (index: number, text: string) => void;
  hints: ReturnType<typeof useSlotHintPlayback>;
}) {
  return (
    <>
      {requirements.map((req, index) =>
        textSlot(req, index, fills[index] ?? null, interactive, disabled, onCapture, onMessage, hints),
      )}
    </>
  );
}

function textSlot(
  req: CompletionRequirement,
  index: number,
  fill: SlotFill | null,
  interactive: boolean,
  disabled: boolean,
  onCapture: ((index: number, file: File, durationSeconds?: number) => void) | undefined,
  onMessage: ((index: number, text: string) => void) | undefined,
  hints: ReturnType<typeof useSlotHintPlayback>,
) {
  const hintControls = slotHintControls(req, index, hints);
  if (req.kind === "audio") {
    return (
      <AudioSlot
        key={`audio-${index}`}
        req={req}
        index={index}
        fill={fill}
        interactive={interactive}
        disabled={disabled}
        onCapture={onCapture}
        hintControls={hintControls}
      />
    );
  }
  if (req.kind !== "message") return null;
  return (
    <MessageSlot
      key={`message-${index}`}
      req={req}
      index={index}
      fill={fill}
      interactive={interactive}
      disabled={disabled}
      onMessage={onMessage}
      hintControls={hintControls}
    />
  );
}

function VisualSlotHeader({
  requirements,
  fills,
  visualCount,
}: {
  requirements: CompletionRequirement[];
  fills: Array<SlotFill | null>;
  visualCount: number;
}) {
  const counts = countVisualKinds(requirements);
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
      <Typography variant="subtitle2">
        {he.completionVisualSummary(counts.photos, counts.videos)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {he.completionSlotsProgress(filledVisualCount(requirements, fills), visualCount)}
      </Typography>
    </Box>
  );
}

function VisualSlotList({
  requirements,
  fills,
  interactive,
  disabled,
  onCapture,
  onAnnotatingChange,
  onEnlarge,
  onMarkPhoto,
  markedPhotoUrls,
  hints,
}: {
  requirements: CompletionRequirement[];
  fills: Array<SlotFill | null>;
  interactive: boolean;
  disabled?: boolean;
  onCapture?: (index: number, file: File, durationSeconds?: number) => void;
  onAnnotatingChange?: (busy: boolean) => void;
  onEnlarge: (src: string, title: string, kind?: "photo" | "video") => void;
  onMarkPhoto?: (url: string) => void;
  markedPhotoUrls?: string[];
  hints: ReturnType<typeof useSlotHintPlayback>;
}) {
  const visualCount = visualSlotCount(requirements);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: visualCount === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 1.5,
      }}
    >
      {requirements.map((req, index) =>
        req.kind === "photo" || req.kind === "video" ? (
          <CompletionSlotTile
            key={`${req.kind}-${index}`}
            req={req}
            index={index}
            fill={fills[index] ?? null}
            interactive={interactive}
            disabled={disabled}
            onCapture={onCapture ? (file, duration) => onCapture(index, file, duration) : undefined}
            onAnnotatingChange={onAnnotatingChange}
            onEnlarge={(src, kind) => onEnlarge(src, slotDisplayTitle(req, index), kind)}
            onMarkPhoto={onMarkPhoto}
            photoMarked={Boolean(fills[index]?.url && markedPhotoUrls?.includes(fills[index]?.url || ""))}
            hintControls={slotHintControls(req, index, hints)}
          />
        ) : null,
      )}
    </Box>
  );
}

function slotHintControls(
  req: CompletionRequirement,
  index: number,
  hints: ReturnType<typeof useSlotHintPlayback>,
) {
  const text = slotGuideText(req);
  if (!text) return undefined;
  const id = `slot-hint-${index}`;
  return {
    speaking: hints.speakingId === id,
    loading: hints.loadingId === id,
    listenEnabled: true,
    onShow: () => {
      void hints.show(id, text, slotDisplayTitle(req, index));
    },
    onSpeak: () => {
      void hints.speak(id, text);
    },
  };
}

function AudioSlot({
  req,
  index,
  fill,
  interactive,
  disabled,
  onCapture,
  hintControls,
}: {
  req: CompletionRequirement;
  index: number;
  fill: SlotFill | null;
  interactive: boolean;
  disabled?: boolean;
  onCapture?: (index: number, file: File, durationSeconds?: number) => void;
  hintControls: ReturnType<typeof slotHintControls>;
}) {
  const src = slotFillSrc(fill);
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography variant="subtitle2">{slotDisplayTitle(req, index)}</Typography>
        {hintControls ? <CompletionSlotHintButtons {...hintControls} inline /> : null}
      </Box>
      {interactive && onCapture && (
        <MediaCaptureActions
          photoAdded={false}
          videoAdded={false}
          audioAdded={Boolean(src)}
          uploadingKind={null}
          disabled={disabled}
          allowedKinds={["audio"]}
          onCapture={(file) => onCapture(index, file)}
        />
      )}
      {src && <Box component="audio" src={src} controls sx={{ mt: 1, width: "100%" }} />}
    </Box>
  );
}

function MessageSlot({
  req,
  index,
  fill,
  interactive,
  disabled,
  onMessage,
  hintControls,
}: {
  req: CompletionRequirement;
  index: number;
  fill: SlotFill | null;
  interactive: boolean;
  disabled?: boolean;
  onMessage?: (index: number, text: string) => void;
  hintControls: ReturnType<typeof slotHintControls>;
}) {
  const text = fill?.text ?? "";
  if (!interactive && !text.trim()) return null;
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography variant="subtitle2">{slotDisplayTitle(req, index)}</Typography>
        {hintControls ? <CompletionSlotHintButtons {...hintControls} inline /> : null}
      </Box>
      {interactive && onMessage ? (
        <TextField
          label={he.completionReqMessage}
          value={text}
          onChange={(event) => onMessage(index, event.target.value)}
          disabled={disabled}
          fullWidth
          multiline
          minRows={2}
          inputProps={{ maxLength: MAX_MESSAGE_TEXT }}
        />
      ) : (
        <Typography variant="body2">{text}</Typography>
      )}
    </Box>
  );
}
