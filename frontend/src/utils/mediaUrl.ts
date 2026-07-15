/** Résout une URL de média stockée côté serveur (/uploads/...) en URL absolue. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "";
  return `${base}${path}`;
}
