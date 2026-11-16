import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";
import { formatClock, tabStatusText } from "./flowStack";
import { skipReasonText } from "./slotSkip";
import { isHandedOver, needsSending, skippedCount, type SlotUiState } from "./slotUploadState";

export type SummaryRow = {
  index: number;
  title: string;
  status: SlotUiState["status"];
  statusText: string;
  sent: boolean;
  /** « לא ניתן לצלם » : la carte n'a pas été filmée. */
  skipped: boolean;
  /** Raison courte affichée sous le titre d'une carte non filmée. */
  reasonText: string;
  /** Carte pas encore faite (récap ouvert avant la fin avec l'icône « סיכום »). */
  notYet: boolean;
  /** « לצלם עכשיו » : carte pas encore faite, ou non filmée et pas encore partie : on peut encore la filmer. */
  canFilmNow: boolean;
  /** Heure d'envoi (« 06:43 ») ; vide tant que rien n'est parti. */
  sentTime: string;
};

/** Une ligne par carte : titre du menahel + statut réel (envoyé à 06:43, ou en attente de réseau). */
export function summaryRows(requirements: CompletionRequirement[], states: SlotUiState[]): SummaryRow[] {
  return requirements.map((req, index) => {
    const state = states[index] ?? { status: "idle", kind: req.kind };
    const skipped = state.status === "skipped" && Boolean(state.skip);
    const notYet = isNotYet(state);
    return {
      index,
      title: slotDisplayTitle(req, index),
      status: state.status,
      statusText: tabStatusText(state),
      sent: state.status === "sent",
      skipped,
      reasonText: skipped && state.skip ? skipReasonText(state.skip) : "",
      notYet,
      canFilmNow: notYet || (skipped && !state.skip?.sent),
      sentTime: state.status === "sent" ? formatClock(state.sentAt) : "",
    };
  });
}

/** Carte ni remise ni en échec d'envoi : l'oved ne l'a pas encore faite. */
export function isNotYet(state: SlotUiState): boolean {
  return !isHandedOver(state.status) && state.status !== "failed";
}

export function notYetCount(states: SlotUiState[]): number {
  return states.filter(isNotYet).length;
}

/**
 * Écran 10 : « ready » = il y a quelque chose à envoyer (bouton שליחת הסרטונים, même si d'autres cartes
 * restent à faire), « sending » = envoi en cours, « incomplete » = rien à envoyer mais des cartes restent
 * (retour au tournage), « done » = tout est parti.
 */
export type SummaryPhase = "ready" | "sending" | "incomplete" | "done";

export function summaryPhase(states: SlotUiState[], sending: boolean): SummaryPhase {
  if (sending || states.some((s) => s.status === "uploading")) return "sending";
  if (needsSending(states)) return "ready";
  return notYetCount(states) > 0 ? "incomplete" : "done";
}

export function hasPendingUpload(states: SlotUiState[]): boolean {
  return states.some((s) => s.status === "queued" || s.status === "uploading");
}

/** Le récap s'affiche quand chaque carte est remise (envoyée, gardée sur l'appareil ou déclarée « לא ניתן לצלם »). */
export function readyForSummary(states: SlotUiState[]): boolean {
  return states.length > 0 && states.every((s) => isHandedOver(s.status));
}

/** Vidéos réellement remises (hors cartes non filmées). */
export function filmedTotal(states: SlotUiState[]): number {
  return states.filter((s) => isHandedOver(s.status) && s.status !== "skipped").length;
}

/** Écran 10ב : titre et sous-titre quand certaines cartes n'ont pas été filmées ; null si tout est filmé. */
export function partialHeadline(states: SlotUiState[]): { title: string; subtitle: string } | null {
  const left = notYetCount(states);
  if (left > 0) {
    return { title: he.flowSummaryTitlePartial(filmedTotal(states), states.length), subtitle: he.flowSummarySubtitleNotYet(left) };
  }
  const skipped = skippedCount(states);
  if (skipped === 0) return null;
  return {
    title: he.flowSummaryTitlePartial(filmedTotal(states), states.length),
    subtitle: he.flowSummarySubtitlePartial(skipped),
  };
}

/** Titre de la carte blanche du récap (« פתיחת משמרת · 2 מתוך 3 צולמו »). */
export function summaryCardHeading(states: SlotUiState[]): string {
  if (skippedCount(states) > 0 || notYetCount(states) > 0) return he.flowSummaryCardPartial(filmedTotal(states), states.length);
  return he.flowSummaryCardAll(filmedTotal(states), states.length);
}

/** Nombre de vidéos envoyées au menahel : alimente le texte du popup de confirmation (écran 11). */
export function sentVideoCount(states: SlotUiState[]): number {
  return states.filter((s) => s.status === "sent").length;
}
