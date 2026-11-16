import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Clé de la toute première entrée de l'historique (page ouverte directement, lien, rechargement). */
const FIRST_ENTRY_KEY = "default";

/** Vrai si l'utilisateur est arrivé ici depuis une autre page de l'appli. */
export function hasInAppPrevious(locationKey: string | undefined): boolean {
  return Boolean(locationKey) && locationKey !== FIRST_ENTRY_KEY;
}

/**
 * « חזרה » : revient à la page d'où l'on vient (« + » ouvert depuis בית, צוות…) ;
 * sans page précédente dans l'appli, va à `fallback`.
 */
export function useGoBackOr(fallback: string): () => void {
  const navigate = useNavigate();
  const { key } = useLocation();
  return useCallback(() => {
    if (hasInAppPrevious(key)) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, key, fallback]);
}
