import { useRef } from "react";
import CompletionSlotGrid from "./CompletionSlotGrid";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import type { CompletionKind, CompletionRequirement } from "../../utils/completionMedia";
import {
  applyPendingSlot,
  pendingSlotHasFile,
  type PendingMedia,
} from "../../utils/pendingMedia";

export default function CompletionRequirementSlots({
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
  if (!requirements.length) return null;

  const setSlot = (index: number, file: File, durationSeconds?: number) => {
    onChange(applyPendingSlot(slotsRef.current, index, file, durationSeconds));
  };

  return (
    <CompletionSlotGrid
      requirements={requirements}
      fills={requirements.map((req, index) => fillFromSlot(req.kind, slots[index]))}
      interactive
      disabled={disabled}
      language={language}
      onCapture={setSlot}
      onAnnotatingChange={onAnnotatingChange}
    />
  );
}

function fillFromSlot(kind: CompletionKind, media: PendingMedia | null) {
  if (pendingSlotHasFile(media)) return { previewUrl: media.previewUrl, kind };
  if (media?.keptUrl) return { url: media.keptUrl, kind };
  return null;
}
