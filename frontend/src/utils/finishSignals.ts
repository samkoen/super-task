import { isRetryableSlotError } from "./slotUploadQueue";

/**
 * Oved sans קליטה : « la tâche est finie » est gardé sur le téléphone puis envoyé dès qu'un peu de réseau
 * revient, AVANT les vidéos (quelques octets au lieu de plusieurs Mo). Le menahel voit alors
 * « בוצע · ממתין להעלאה » sans attendre les fichiers.
 */
export type FinishMarker = { occurrenceId: string; finishedAt: string };

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

const KEY = "super-finish-signals";

function safeStore(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readFinishMarkers(store: KeyValueStore | null = safeStore()): FinishMarker[] {
  try {
    const raw = store?.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is FinishMarker => typeof row?.occurrenceId === "string" && typeof row?.finishedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeFinishMarkers(markers: FinishMarker[], store: KeyValueStore | null): void {
  try {
    store?.setItem(KEY, JSON.stringify(markers));
  } catch {
    /* stockage plein ou bloqué : le signal partira simplement avec les vidéos */
  }
}

/** La tâche est finie sur le téléphone ; on garde l'heure de la première fin (un renvoi ne la décale pas). */
export function rememberFinished(
  occurrenceId: string,
  finishedAt: string = new Date().toISOString(),
  store: KeyValueStore | null = safeStore(),
): void {
  const markers = readFinishMarkers(store);
  if (markers.some((marker) => marker.occurrenceId === occurrenceId)) return;
  writeFinishMarkers([...markers, { occurrenceId, finishedAt }], store);
}

/**
 * Envoie les signaux en attente, dans l'ordre. Réseau coupé : on s'arrête et on garde le reste.
 * Refus définitif du serveur (tâche supprimée, droits) : le signal est abandonné, les vidéos décideront.
 */
export async function flushFinishSignals(
  send: (marker: FinishMarker) => Promise<unknown>,
  store: KeyValueStore | null = safeStore(),
): Promise<void> {
  let remaining = readFinishMarkers(store);
  for (const marker of [...remaining]) {
    try {
      await send(marker);
    } catch (error) {
      if (isRetryableSlotError(error)) return;
    }
    remaining = remaining.filter((row) => row.occurrenceId !== marker.occurrenceId);
    writeFinishMarkers(remaining, store);
  }
}
