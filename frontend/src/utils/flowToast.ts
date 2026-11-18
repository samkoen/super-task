import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";

/**
 * `kept` : écran 09, la carte est confirmée et le réseau est là.
 * `keptOffline` : écran 09ב, pas de réseau ; le média attend sur l'appareil.
 * `skipReported` : écran 05ז, « לא ניתן לצלם » déclaré ; pas de popup, juste ce toast.
 * Dans tous les cas l'envoi au serveur se fait au récap (écran 10).
 */
export type FlowToastKind = "kept" | "keptOffline" | "failed" | "skipReported";

export type FlowToastState = {
  kind: FlowToastKind;
  remaining: number;
  mediaKind?: CompletionRequirement["kind"];
  /** Raison donnée par le serveur quand l'envoi est refusé. */
  reason?: string;
  /** Titre de la sous-tâche (« הדיווח נשלח למנהלת • סרטון בסטה »). */
  slotTitle?: string;
};

export type FlowToastContent = { title: string; subtitle: string; tone: "success" | "pending" | "error" };

function savedOnDeviceText(kind: CompletionRequirement["kind"] | undefined): string {
  if (kind === "photo") return he.flowToastSavedOnDevicePhoto;
  if (kind === "audio") return he.flowToastSavedOnDeviceAudio;
  if (kind === "message") return he.flowToastSavedOnDeviceMessage;
  return he.flowToastSavedOnDevice;
}

export function flowToastContent(toast: FlowToastState): FlowToastContent {
  if (toast.kind === "failed") return { title: he.flowToastFailed, subtitle: toast.reason?.trim() || "", tone: "error" };
  if (toast.kind === "skipReported") return { title: he.flowToastSkipReported, subtitle: toast.slotTitle?.trim() || "", tone: "success" };
  if (toast.kind === "keptOffline") return { title: savedOnDeviceText(toast.mediaKind), subtitle: "", tone: "pending" };
  if (toast.remaining <= 0) return { title: he.flowToastKept, subtitle: he.flowToastAllReady, tone: "success" };
  return { title: he.flowToastKept, subtitle: he.flowToastRemaining(toast.remaining), tone: "success" };
}

/** Nombre de cartes encore à confirmer (ni confirmées, ni envoyées, ni en file sur l'appareil). */
export function remainingAfter(statuses: string[], justHandedOver: number): number {
  const done = ["sent", "ready", "queued", "uploading", "skipped"];
  return statuses.filter((s, i) => i !== justHandedOver && !done.includes(s)).length;
}
