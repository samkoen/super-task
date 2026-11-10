import { he } from "../i18n/he";

export type FlowToastKind = "kept" | "failed";

export type FlowToastState = { kind: FlowToastKind; remaining: number };

export type FlowToastContent = { title: string; subtitle: string; tone: "success" | "pending" | "error" };

/** Toast 09 : la carte est confirmée et gardée ; l'envoi au serveur se fait à la fin (écran 10). */
export function flowToastContent(toast: FlowToastState): FlowToastContent {
  if (toast.kind === "failed") return { title: he.flowToastFailed, subtitle: "", tone: "error" };
  if (toast.remaining <= 0) return { title: he.flowToastKept, subtitle: he.flowToastAllReady, tone: "success" };
  return { title: he.flowToastKept, subtitle: he.flowToastRemaining(toast.remaining), tone: "success" };
}

/** Nombre de cartes encore à confirmer (ni confirmées, ni envoyées, ni en file sur l'appareil). */
export function remainingAfter(statuses: string[], justHandedOver: number): number {
  const done = ["sent", "ready", "queued", "uploading"];
  return statuses.filter((s, i) => i !== justHandedOver && !done.includes(s)).length;
}
