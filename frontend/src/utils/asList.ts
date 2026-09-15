/** Garantit un tableau — les GET axios peuvent renvoyer undefined / un objet. */
export function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** Texte sûr pour un enfant React — un objet API ferait planter la page. */
export function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}
