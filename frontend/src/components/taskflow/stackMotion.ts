import type { Transition, Variants } from "framer-motion";

/**
 * Animations de la pile de cartes (FLOW 1), avec framer-motion, inspirées des « card swipe / card stack »
 * demandées : la carte active part (glissée de côté quand on choisit un autre onglet, envolée vers le haut
 * quand elle vient d'être remise), chaque élément glisse jusqu'à sa nouvelle place et la nouvelle carte
 * active « monte » avec un rebond.
 */

/** Pourquoi la carte active s'en va : l'oved a touché un autre onglet, ou la carte vient d'être remise. */
export type ExitKind = "swipe" | "done";

/** Sans `matchMedia` (tests jsdom) ou avec « réduire les animations » : tout change d'un coup, comme avant. */
export function stackMotionEnabled(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Glissement de chaque onglet / carte vers sa nouvelle place dans la pile. */
export const STACK_LAYOUT_TRANSITION: Transition = { type: "spring", stiffness: 420, damping: 36 };

const EASE_IN = [0.4, 0, 1, 1] as const;

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 56, scale: 0.9 },
  enter: { opacity: 1, y: 0, scale: 1, rotate: 0, x: 0, transition: { type: "spring", stiffness: 260, damping: 20, mass: 0.9 } },
  exit: (kind: ExitKind) =>
    kind === "done"
      ? // Carte remise : elle remonte vers les onglets « נשלח » au-dessus.
        { opacity: 0, y: "-22%", scale: 0.86, transition: { duration: 0.28, ease: EASE_IN } }
      : // Glissée de côté avec une légère rotation (Dribbble « Card swipe micro-interaction »).
        { opacity: 0, x: "-45%", rotate: -7, scale: 0.92, transition: { duration: 0.26, ease: EASE_IN } },
};

export const tabVariants: Variants = {
  initial: { opacity: 0, y: -10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};
