import { he } from "../i18n/he";

export type FlowToastKind = "sent" | "saved" | "failed" | "taskDone";

export type FlowToastState = { kind: FlowToastKind; remaining: number };

export type FlowToastContent = { title: string; subtitle: string; tone: "success" | "pending" | "error" };

/** Textes des toasts 09 (envoyé), 09b (sauvé sur l'appareil) et de la dernière carte. */
export function flowToastContent(toast: FlowToastState): FlowToastContent {
  if (toast.kind === "saved") {
    return { title: he.flowToastSavedOnDevice, subtitle: he.flowToastSavedHint, tone: "pending" };
  }
  if (toast.kind === "failed") return { title: he.flowToastFailed, subtitle: "", tone: "error" };
  if (toast.kind === "taskDone" || toast.remaining <= 0) {
    return { title: he.flowToastSent, subtitle: he.flowToastTaskDone, tone: "success" };
  }
  return { title: he.flowToastSent, subtitle: he.flowToastRemaining(toast.remaining), tone: "success" };
}

/** Nombre de cartes encore à remettre (ni envoyées ni en file sur l'appareil). */
export function remainingAfter(statuses: string[], justHandedOver: number): number {
  const open = statuses.filter((s, i) => i !== justHandedOver && s !== "sent" && s !== "queued" && s !== "uploading");
  return open.length;
}
