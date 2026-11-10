import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";
import { tabStatusText } from "./flowStack";
import { isHandedOver, type SlotUiState } from "./slotUploadState";

export type SummaryRow = { index: number; title: string; status: SlotUiState["status"]; statusText: string; sent: boolean };

/** Une ligne par carte : titre du menahel + statut réel (envoyé à 06:43, ou en attente de réseau). */
export function summaryRows(requirements: CompletionRequirement[], states: SlotUiState[]): SummaryRow[] {
  return requirements.map((req, index) => {
    const state = states[index] ?? { status: "idle", kind: req.kind };
    return {
      index,
      title: slotDisplayTitle(req, index),
      status: state.status,
      statusText: tabStatusText(state),
      sent: state.status === "sent",
    };
  });
}

export function hasPendingUpload(states: SlotUiState[]): boolean {
  return states.some((s) => s.status === "queued" || s.status === "uploading");
}

/** Le récap s'affiche quand chaque carte est remise (envoyée ou gardée sur l'appareil). */
export function readyForSummary(states: SlotUiState[]): boolean {
  return states.length > 0 && states.every((s) => isHandedOver(s.status));
}
