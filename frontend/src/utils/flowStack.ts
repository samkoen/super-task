import { he } from "../i18n/he";
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
export function resolveActive(states: SlotUiState[], preferred: number | null): number | null {
  if (!states.length) return null;
  if (preferred !== null && states[preferred] && !isHandedOver(states[preferred].status)) return preferred;
  if (preferred !== null && states[preferred]) return nextOpenIndex(states, preferred);
  const first = firstOpenIndex(states);
  return isHandedOver(states[first].status) ? null : first;
}

export function stackLayout(states: SlotUiState[], preferred: number | null): StackLayout {
  const active = resolveActive(states, preferred);
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
  const hour = now.getHours();
  if (hour < 12) return he.flowGreetingMorning(who);
  if (hour < 18) return he.flowGreetingNoon(who);
  return he.flowGreetingEvening(who);
}

/** Texte du gros bouton de la carte, selon le type de sous-tâche. */
export function primaryActionLabel(kind: CompletionRequirement["kind"]): string {
  if (kind === "photo") return he.flowActionPhoto;
  if (kind === "audio") return he.flowActionAudio;
  if (kind === "message") return he.flowActionMessage;
  return he.flowActionVideo;
}

/** Le lien « דוגמא לצילום נכון » est actif seulement si le menahel a donné une vidéo, une image ou une consigne. */
export function hasGuide(req: CompletionRequirement): boolean {
  return Boolean(req.guide_video_url || req.example_url || (req.hint || "").trim());
}

/** Texte de l'onglet replié selon l'état d'envoi. */
export function tabStatusText(state: SlotUiState): string {
  if (state.status === "sent") return he.flowTabSent(formatClock(state.sentAt));
  if (state.status === "failed") return he.flowTabFailed;
  if (state.status === "uploading") return he.flowTabUploading;
  if (state.status === "ready") return he.flowTabReady;
  return he.flowTabWaiting;
}
