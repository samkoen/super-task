/** Coordonnées GPS d'un snif saisies par le menahel (champs texte du formulaire). */

export type CoordinateFields = { latitude: string; longitude: string };

export const emptyCoordinates: CoordinateFields = { latitude: "", longitude: "" };

export function coordinatesToFields(latitude?: number | null, longitude?: number | null): CoordinateFields {
  if (typeof latitude !== "number" || typeof longitude !== "number") return emptyCoordinates;
  return { latitude: String(latitude), longitude: String(longitude) };
}

function parseField(text: string): number | null | string {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  // Une saisie illisible part telle quelle : le serveur la refuse avec un message clair.
  return Number.isFinite(value) ? value : trimmed;
}

/** Valeurs à envoyer à l'API : deux nombres, ou deux `null` pour effacer. */
export function coordinatesPayload(fields: CoordinateFields) {
  return { latitude: parseField(fields.latitude), longitude: parseField(fields.longitude) };
}

/** Arrondi à ~1 m : inutile d'afficher davantage de décimales. */
export function fieldsFromPosition(lat: number, lng: number): CoordinateFields {
  return { latitude: lat.toFixed(6), longitude: lng.toFixed(6) };
}
