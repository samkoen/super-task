import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Recharge la liste quand une tâche sort de la file d'envoi du téléphone.
 *
 * Le flux se ferme souvent avant que les vidéos soient parties (retour Android sur le récap,
 * fichier encore en file). Le serveur ne passe la tâche en contrôle qu'à la réception du
 * dernier fichier ; sans ce rechargement, la page garde « בתהליך » et l'écran de כניסה revient.
 *
 * Retourne les tâches à traiter comme « en attente » : celles encore en file, plus celles qui
 * viennent d'en sortir tant que le rechargement n'est pas fini (sinon la porte clignote).
 */
export function useReloadWhenUploadsLand(
  taskIds: ReadonlySet<string>,
  reload: () => Promise<unknown>,
): ReadonlySet<string> {
  const previous = useRef<ReadonlySet<string>>(taskIds);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const [landing, setLanding] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const landed = [...previous.current].filter((id) => !taskIds.has(id));
    previous.current = taskIds;
    if (landed.length === 0) return;
    setLanding((prev) => new Set([...prev, ...landed]));
    const done = () =>
      setLanding((prev) => {
        const next = new Set(prev);
        landed.forEach((id) => next.delete(id));
        return next;
      });
    Promise.resolve()
      .then(() => reloadRef.current())
      .finally(done)
      .catch(() => undefined);
  }, [taskIds]);

  return useMemo(
    () => (landing.size === 0 ? taskIds : new Set([...taskIds, ...landing])),
    [taskIds, landing],
  );
}
