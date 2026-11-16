import {
  DEFAULT_VIDEO_SECONDS,
  kindSkipsExample,
  type CompletionKind,
  type CompletionRequirement,
} from "./completionMedia";

/** Déplace une carte d'un cran (−1 = plus tôt, +1 = plus tard) ; renvoie la liste inchangée au bord. */
export function moveRequirement(
  list: CompletionRequirement[],
  index: number,
  delta: -1 | 1,
): CompletionRequirement[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Change le type d'une carte en gardant titre et consigne.
 * L'image et la vidéo d'exemple ne restent que pour photo / vidéo ; la durée minimale que pour la vidéo.
 */
export function changeRequirementKind(
  list: CompletionRequirement[],
  index: number,
  kind: CompletionKind,
): CompletionRequirement[] {
  return list.map((item, i) => {
    if (i !== index || item.kind === kind) return item;
    const base: CompletionRequirement = { kind };
    if (item.title) base.title = item.title;
    if (item.hint) base.hint = item.hint;
    if (!kindSkipsExample(kind)) {
      if (item.example_url) base.example_url = item.example_url;
      if (item.pending_example) base.pending_example = item.pending_example;
      if (item.guide_video_url) base.guide_video_url = item.guide_video_url;
      if (item.pending_guide_video) base.pending_guide_video = item.pending_guide_video;
    }
    if (kind === "video") base.min_seconds = item.min_seconds ?? DEFAULT_VIDEO_SECONDS;
    if (kind === "photo") base.slot = true;
    return base;
  });
}

/** Retire l'image d'exemple d'une carte (le fichier local éventuel est oublié aussi). */
export function clearRequirementExample(list: CompletionRequirement[], index: number): CompletionRequirement[] {
  return list.map((item, i) => {
    if (i !== index) return item;
    const { example_url: _url, pending_example: _file, ...rest } = item;
    return rest;
  });
}

/** Carte active après une suppression : la même position si possible, sinon la dernière. */
export function activeAfterRemove(active: number, removed: number, nextLength: number): number {
  if (nextLength === 0) return 0;
  if (removed < active) return active - 1;
  return Math.min(active, nextLength - 1);
}

/** Heure affichée en tête (« בשעה 6:30 ») depuis « 06:30 ». */
export function displayHour(dueTime: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(dueTime || "");
  if (!match) return "";
  return `${Number(match[1])}:${match[2]}`;
}

/** ISO d'aujourd'hui à l'heure prévue, pour l'aperçu oved (TaskFlowHeader attend une date complète). */
export function todayAt(dueTime: string | null | undefined, now: Date = new Date()): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(dueTime || "");
  if (!match) return null;
  const date = new Date(now);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toISOString();
}

/** Comparaison « y a-t-il des changements » : les fichiers locaux comptent par leur aperçu blob:. */
export function sameDraft(a: unknown, b: unknown): boolean {
  const replacer = (_key: string, value: unknown) => (value instanceof File ? `file:${value.name}:${value.size}` : value);
  return JSON.stringify(a, replacer) === JSON.stringify(b, replacer);
}
