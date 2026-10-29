import { useRef } from "react";
import { Box } from "@mui/material";
import CaptureStepCard, { type StepHintControls } from "./CaptureStepCard";
import type { useSlotHintPlayback } from "../../hooks/useSlotHintPlayback";
import { captureProgress } from "../../utils/captureProgress";
import type { CompletionRequirement, SlotReview } from "../../utils/completionMedia";
import { slotDisplayTitle, slotGuideText } from "../../utils/completionSlotView";
import { applyMessageSlot, applyPendingSlot, type PendingMedia } from "../../utils/pendingMedia";

export type SlotHints = ReturnType<typeof useSlotHintPlayback>;

function hintControlsFor(
  req: CompletionRequirement,
  index: number,
  hints: SlotHints,
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

/** Sous-tâches côté oved : une tuile par exigence, chacune à un tiers d'écran, on défile au-delà de trois. */
export default function EmployeeCaptureSteps({
  requirements,
  slots,
  onChange,
  hints,
  disabled = false,
  onAnnotatingChange,
  onAsk,
  reviews,
}: {
  requirements: CompletionRequirement[];
  slots: Array<PendingMedia | null>;
  onChange: (next: Array<PendingMedia | null>) => void;
  hints: SlotHints;
  disabled?: boolean;
  onAnnotatingChange?: (busy: boolean) => void;
  /** Question sur une sous-tâche : reçoit son titre. */
  onAsk?: (title: string) => void;
  /** Contrôle V/X du menahel, case par case (même ordre que `requirements`). */
  reviews?: Array<SlotReview | null>;
}) {
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  if (!requirements.length) return null;
  const progress = captureProgress(requirements, slots);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {requirements.map((req, index) => (
        <CaptureStepCard
          key={`${req.kind}-${index}`}
          req={req}
          index={index}
          state={progress.states[index]}
          media={slots[index] ?? null}
          review={reviews?.[index] ?? null}
          disabled={disabled}
          hintControls={hintControlsFor(req, index, hints)}
          onCapture={(file, seconds) => onChange(applyPendingSlot(slotsRef.current, index, file, seconds))}
          onMessage={(text) => onChange(applyMessageSlot(slotsRef.current, index, text))}
          onAnnotatingChange={onAnnotatingChange}
          onAsk={onAsk ? () => onAsk(slotDisplayTitle(req, index)) : undefined}
        />
      ))}
    </Box>
  );
}
