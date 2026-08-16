import { he } from "../i18n/he";

/** Sous-titre dashboard menahel : שלום, X (שם הרשת) — une seule ligne. */
export function managerWelcomeSubtitle(
  fullName: string | null | undefined,
  networkName?: string | null
): string | undefined {
  const name = (fullName || "").trim();
  if (!name) return undefined;
  const base = he.welcome(name);
  const network = (networkName || "").trim();
  return network ? `${base} (${network})` : base;
}
