import cardShape from "../assets/flow1/card-shape.svg";
import tabShape from "../assets/flow1/tab-shape.svg";
import tabShapeNarrow from "../assets/flow1/tab-shape-narrow.svg";

/**
 * Silhouettes vectorielles exportées du Figma (bord supérieur légèrement ondulé).
 * Utilisées comme masque : la couleur de la teinte (blanc, vert, orange) vient de `bgcolor`.
 */
export const flowShape = { card: cardShape, tab: tabShape, tabNarrow: tabShapeNarrow } as const;

/** Applique une silhouette SVG étirée sur tout le bloc (le SVG est en `preserveAspectRatio=none`). */
export function flowMaskSx(url: string) {
  return {
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  } as const;
}
