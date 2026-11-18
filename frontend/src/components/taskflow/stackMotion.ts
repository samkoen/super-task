/**
 * Animations de la pile de cartes (FLOW 1), inspirées des « card swipe / card stack » demandées :
 * la carte active part (glissée de côté quand on choisit un autre onglet, envolée vers le haut quand
 * elle vient d'être remise), puis chaque carte glisse jusqu'à sa nouvelle place (FLIP) et la nouvelle
 * carte active « monte » avec un petit rebond.
 *
 * Web Animations API seulement : sans `Element.animate` (tests jsdom) ou avec « réduire les animations »,
 * tout change d'un coup, comme avant.
 */

export type ExitKind = "swipe" | "done";

const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

const EXIT_FRAMES: Record<ExitKind, Keyframe[]> = {
  // Glissée de côté avec une légère rotation (Dribbble « Card swipe micro-interaction »).
  swipe: [
    { transform: "none", opacity: 1 },
    { transform: "translateX(-38%) rotate(-6deg) scale(0.92)", opacity: 0 },
  ],
  // Carte remise : elle remonte vers les onglets « נשלח » au-dessus.
  done: [
    { transform: "none", opacity: 1 },
    { transform: "translateY(-18%) scale(0.86)", opacity: 0 },
  ],
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function stackMotionEnabled(): boolean {
  return typeof Element !== "undefined" && typeof Element.prototype.animate === "function" && !prefersReducedMotion();
}

/** Position de chaque élément de la pile (onglets et carte), par numéro de sous-tâche. */
export type StackSnapshot = Map<string, DOMRect>;

function stackItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.index !== undefined);
}

export function snapshotStack(container: HTMLElement | null): StackSnapshot {
  const rects: StackSnapshot = new Map();
  if (!container) return rects;
  stackItems(container).forEach((el) => rects.set(el.dataset.index as string, el.getBoundingClientRect()));
  return rects;
}

function activeCard(container: HTMLElement | null): HTMLElement | null {
  return container?.querySelector<HTMLElement>(':scope > [data-testid="flow-card"]') ?? null;
}

/** Fait partir la carte active ; résout quand l'animation est finie (ou tout de suite si rien à animer). */
export async function animateExit(container: HTMLElement | null, kind: ExitKind): Promise<void> {
  const card = activeCard(container);
  if (!card || !stackMotionEnabled()) return;
  const animation = card.animate(EXIT_FRAMES[kind], { duration: kind === "done" ? 280 : 230, easing: EASE_IN, fill: "forwards" });
  try {
    await animation.finished;
  } catch {
    // Animation annulée (démontage) : on continue quand même.
  }
}

/** Après le changement de carte active : chaque élément glisse depuis son ancienne place. */
export function animateSettle(container: HTMLElement | null, before: StackSnapshot, previousActive: number | null): void {
  if (!container || !stackMotionEnabled()) return;
  stackItems(container).forEach((el) => {
    const index = el.dataset.index as string;
    const old = before.get(index);
    const now = el.getBoundingClientRect();
    const dy = old ? old.top - now.top : 24;
    const isCard = el.dataset.testid === "flow-card";
    if (isCard) {
      el.animate(
        [
          { transform: `translateY(${dy}px) scale(0.94)`, opacity: 0.55 },
          { transform: "translateY(-6px) scale(1.012)", opacity: 1, offset: 0.7 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 480, easing: EASE_OUT },
      );
      return;
    }
    // L'ancienne carte active est partie (opacité 0) : son onglet réapparaît en glissant.
    const wasCard = previousActive !== null && String(previousActive) === index;
    el.animate(
      [
        { transform: `translateY(${dy}px)`, opacity: wasCard || !old ? 0 : 1 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 400, easing: EASE_OUT },
    );
  });
}
