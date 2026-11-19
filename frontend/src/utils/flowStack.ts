import { he } from "../i18n/he";
import { periodForHour } from "./todayPeriods";
import type { CompletionRequirement } from "./completionMedia";
import { isHandedOver, nextOpenIndex, firstOpenIndex, type SlotUiState } from "./slotUploadState";

/** Disposition de la pile : les cartes remises au-dessus, la carte active, les autres en dessous. */
export type StackLayout = {
  active: number | null;
  above: number[];
  below: number[];
};

/**
 * `preferred` est la carte que l'oved a touchée en dernier : il choisit librement l'ordre.
 * Si cette carte est déjà remise, on passe à la suivante encore ouverte.
 */
/** Une carte confirmée mais pas encore envoyée peut être rouverte : revoir la prise, ou la refaire. */
export function canRevisit(state: SlotUiState | undefined): boolean {
  return state?.status === "ready" || (state?.status === "skipped" && !state.skip?.sent);
}

/**
 * Prise confirmée sur l'appareil, ou dont l'envoi a échoué : la carte montre le média (rien n'est perdu),
 * plus « לא ניתן לצלם ».
 */
export function isKeptCapture(state: SlotUiState | undefined): boolean {
  if (!state || state.kind === "message") return false;
  if (state.status === "ready") return true;
  return state.status === "failed" && Boolean(state.previewUrl || state.url);
}

export function resolveActive(states: SlotUiState[], preferred: number | null): number | null {
  if (!states.length) return null;
  if (canRevisit(states[preferred ?? -1])) return preferred;
  if (preferred !== null && states[preferred] && !isHandedOver(states[preferred].status)) return preferred;
  const open = preferred !== null && states[preferred] ? nextOpenIndex(states, preferred) : firstOpen(states);
  // Tout est remis (ex. retour du récap) : une carte reste ouverte, la première qu'on peut encore revoir.
  if (open !== null) return open;
  const revisit = states.findIndex((state) => canRevisit(state));
  return revisit < 0 ? null : revisit;
}

function firstOpen(states: SlotUiState[]): number | null {
  const first = firstOpenIndex(states);
  return isHandedOver(states[first].status) ? null : first;
}

export function stackLayout(states: SlotUiState[], preferred: number | null): StackLayout {
  return layoutAround(states, resolveActive(states, preferred));
}

/** Pile autour d'une carte active imposée (carte qu'on garde à l'écran le temps de l'animation de remise). */
export function layoutAround(states: SlotUiState[], active: number | null): StackLayout {
  const above: number[] = [];
  const below: number[] = [];
  states.forEach((state, index) => {
    if (index === active) return;
    (isHandedOver(state.status) ? above : below).push(index);
  });
  return { active, above, below };
}

/** « 02 » : numéro de la carte, sur deux chiffres comme dans le Figma. */
export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Heure affichée dans « נשלח 06:43 » (24 h, deux chiffres). */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Heure prévue dans l'en-tête (« בשעה 6:30 ») : sans zéro devant l'heure. */
export function formatDueHour(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function greetingFor(name: string | null | undefined, now: Date = new Date()): string {
  const who = (name || "").trim().split(/\s+/)[0] || "";
  // Mêmes seuils que les groupes de tâches : « ערב טוב » dès que commence « משימות ערב ».
  const period = periodForHour(now.getHours());
  if (period === "morning") return he.flowGreetingMorning(who);
  if (period === "noon") return he.flowGreetingNoon(who);
  return he.flowGreetingEvening(who);
}

/** Texte du gros bouton de la carte, selon le type de sous-tâche. */
export function primaryActionLabel(kind: CompletionRequirement["kind"]): string {
  if (kind === "photo") return he.flowActionPhoto;
  if (kind === "audio") return he.flowActionAudio;
  if (kind === "message") return he.flowActionMessage;
  return he.flowActionVideo;
}

/** Bouton d'une prise déjà confirmée : refaire, la lecture se fait sur la carte. */
export function cardActionLabel(kind: CompletionRequirement["kind"], state: SlotUiState | undefined): string {
  if (!isKeptCapture(state)) return primaryActionLabel(kind);
  return kind === "audio" ? he.flowActionRetakeAudio : he.flowReviewRetake;
}

/** Le lien « דוגמא לצילום נכון » est actif seulement si le menahel a donné une vidéo, une image ou une consigne. */
export function hasGuide(req: CompletionRequirement): boolean {
  return Boolean(req.guide_video_url || req.example_url || (req.hint || "").trim());
}

/** Texte de l'onglet replié selon l'état d'envoi. */
export function tabStatusText(state: SlotUiState, online = true): string {
  if (state.status === "skipped") return he.flowTabSkipped;
  if (state.status === "sent") return he.flowTabSent(formatClock(state.sentAt));
  if (state.status === "failed") return he.flowTabFailed;
  if (state.status === "uploading") return he.flowTabUploading;
  // 09ב : sans réseau, une prise confirmée attend sur l'appareil.
  if (state.status === "ready") return online ? he.flowTabReady : he.flowTabWaiting;
  return he.flowTabWaiting;
}

/**
 * Pastille de l'onglet : coche verte (envoyé, ou confirmé avec réseau : écran 09), nuage jaune
 * (attend le réseau sur l'appareil : écran 09ב), ou alerte (non filmé, refusé).
 */
export type TabBadge = "done" | "waiting" | "skipped" | "failed" | "pending";

export function tabBadge(state: SlotUiState, online = true): TabBadge {
  if (state.status === "sent") return "done";
  if (state.status === "ready") return online ? "done" : "waiting";
  if (state.status === "queued") return "waiting";
  if (state.status === "skipped") return "skipped";
  if (state.status === "failed") return "failed";
  return "pending";
}
