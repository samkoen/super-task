import { useEffect, useState } from "react";
import { pickSystemBugPortalHost } from "../utils/systemBugPortal";

/**
 * Hôte de portail = la modale MUI du dessus (ou body), pour qu'un bouton flottant
 * reste cliquable même quand un écran plein écran (tâche, chat…) est ouvert.
 */
export function useTopModalPortalHost() {
  const [host, setHost] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  useEffect(() => {
    const sync = () => setHost(pickSystemBugPortalHost(document.body));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true });
    return () => obs.disconnect();
  }, []);
  return host;
}
