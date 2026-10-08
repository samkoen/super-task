import { useRef, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CaptureStepCard, { type StepHintControls } from "./CaptureStepCard";
import CompletionExampleDialog from "./CompletionExampleDialog";
import CompletionHintDialog from "./CompletionHintDialog";
import { he } from "../../i18n/he";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { useSlotHintPlayback } from "../../hooks/useSlotHintPlayback";
import { EMPLOYEE_BRAND } from "../../styles/employeeUi";
import { captureProgress, type CaptureProgress } from "../../utils/captureProgress";
import { countVisualKinds, type CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle, slotGuideText, visualSlotCount } from "../../utils/completionSlotView";
import { applyMessageSlot, applyPendingSlot, type PendingMedia } from "../../utils/pendingMedia";

type Hints = ReturnType<typeof useSlotHintPlayback>;

function hintControlsFor(
  req: CompletionRequirement,
  index: number,
  hints: Hints,
): StepHintControls | undefined {
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

function ProgressHeader({
  requirements,
  progress,
}: {
  requirements: CompletionRequirement[];
  progress: CaptureProgress;
}) {
  const allDone = progress.total > 0 && progress.remaining === 0;
  const counts = countVisualKinds(requirements);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        <Typography component="h3" sx={{ fontSize: "1.15rem", fontWeight: 800 }}>
          {he.captureStepsTitle}
        </Typography>
        <Typography
          dir="ltr"
          sx={{ fontSize: "1.25rem", fontWeight: 800, color: allDone ? "success.main" : EMPLOYEE_BRAND }}
        >
          {he.completionSlotsProgress(progress.done, progress.total)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress.total ? (progress.done / progress.total) * 100 : 0}
        color={allDone ? "success" : "primary"}
        aria-label={he.captureStepsTitle}
        sx={{ height: 10, borderRadius: 5, bgcolor: alpha(EMPLOYEE_BRAND, 0.12) }}
      />
      {visualSlotCount(requirements) > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {he.completionVisualSummary(counts.photos, counts.videos)}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Étapes de clôture côté oved : une carte par exigence, la prochaine mise en avant. */
export default function EmployeeCaptureSteps({
  requirements,
  slots,
  onChange,
  disabled = false,
  language = "he",
  onAnnotatingChange,
}: {
  requirements: CompletionRequirement[];
  slots: Array<PendingMedia | null>;
  onChange: (next: Array<PendingMedia | null>) => void;
  disabled?: boolean;
  language?: EmployeeLanguage;
  onAnnotatingChange?: (busy: boolean) => void;
}) {
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const hints = useSlotHintPlayback(language);
  const [preview, setPreview] = useState<{ src: string; title: string; kind: "photo" | "video" } | null>(null);
  if (!requirements.length) return null;
  const progress = captureProgress(requirements, slots);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ProgressHeader requirements={requirements} progress={progress} />
      {requirements.map((req, index) => (
        <CaptureStepCard
          key={`${req.kind}-${index}`}
          req={req}
          index={index}
          state={progress.states[index]}
          media={slots[index] ?? null}
          disabled={disabled}
          hintControls={hintControlsFor(req, index, hints)}
          onCapture={(file, seconds) => onChange(applyPendingSlot(slotsRef.current, index, file, seconds))}
          onMessage={(text) => onChange(applyMessageSlot(slotsRef.current, index, text))}
          onAnnotatingChange={onAnnotatingChange}
          onEnlarge={(src, kind) => setPreview({ src, kind, title: slotDisplayTitle(req, index) })}
        />
      ))}
      <CompletionExampleDialog
        src={preview?.src ?? null}
        title={preview?.title ?? ""}
        kind={preview?.kind}
        onClose={() => setPreview(null)}
      />
      {hints.dialog && (
        <CompletionHintDialog title={hints.dialog.title} text={hints.dialog.text} onClose={hints.closeDialog} />
      )}
    </Box>
  );
}
