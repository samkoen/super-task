import CompletionSlotGrid from "./CompletionSlotGrid";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import type { CompletionRequirement } from "../../utils/completionMedia";
import {
  type PendingMedia,
  replacePendingMedia,
} from "../../utils/pendingMedia";

export default function CompletionRequirementSlots({
  requirements,
  slots,
  onChange,
  disabled = false,
  language = "he",
}: {
  requirements: CompletionRequirement[];
  slots: Array<PendingMedia | null>;
  onChange: (next: Array<PendingMedia | null>) => void;
  disabled?: boolean;
  language?: EmployeeLanguage;
}) {
  if (!requirements.length) return null;

  const setSlot = (index: number, file: File, durationSeconds?: number) => {
    const next = [...slots];
    next[index] = replacePendingMedia(slots[index] ?? null, file, durationSeconds ?? null);
    onChange(next);
  };

  return (
    <CompletionSlotGrid
      requirements={requirements}
      fills={requirements.map((req, index) => {
        const media = slots[index];
        return media ? { previewUrl: media.previewUrl, kind: req.kind } : null;
      })}
      interactive
      disabled={disabled}
      language={language}
      onCapture={setSlot}
    />
  );
}
