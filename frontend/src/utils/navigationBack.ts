import type { UserRole } from "../services/api";
import { getHomePath } from "../config/routes";

/** Affiche le retour sauf sur l’accueil du rôle (pas d’historique utile). */
export function shouldShowAppBack(pathname: string, role: UserRole | undefined | null): boolean {
  if (!role) return false;
  const home = getHomePath(role);
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const homeNorm = home.replace(/\/+$/, "") || "/";
  return normalized !== homeNorm;
}
