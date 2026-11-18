import { useEffect, useRef } from "react";

/**
 * Recharge la liste quand une tâche sort de la file d'envoi du téléphone.
 *
 * Le flux se ferme souvent avant que les vidéos soient parties (retour Android sur le récap,
 * fichier encore en file). Le serveur ne passe la tâche en contrôle qu'à la réception du
 * dernier fichier ; sans ce rechargement, la page garde « בתהליך » et l'écran de כניסה revient.
 */
export function useReloadWhenUploadsLand(taskIds: ReadonlySet<string>, reload: () => void): void {
  const previous = useRef<ReadonlySet<string>>(taskIds);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const landed = [...previous.current].some((id) => !taskIds.has(id));
    previous.current = taskIds;
    if (landed) reloadRef.current();
  }, [taskIds]);
}
