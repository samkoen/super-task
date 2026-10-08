import { alpha } from "@mui/material/styles";

/** Jetons visuels de l'espace oved : gros, lisibles, un seul geste par écran. */
export const EMPLOYEE_BRAND = "#0A6B5C";
export const EMPLOYEE_BRAND_DARK = "#064C42";
export const EMPLOYEE_INK = "#0F172A";

export const EMPLOYEE_BRAND_GRADIENT =
  "linear-gradient(135deg, #064C42 0%, #0A6B5C 45%, #14937D 100%)";
export const EMPLOYEE_START_GRADIENT =
  "linear-gradient(135deg, #14532D 0%, #15803D 55%, #22A559 100%)";
export const EMPLOYEE_END_GRADIENT =
  "linear-gradient(135deg, #581C2B 0%, #8B2A3E 55%, #B23A52 100%)";

/** Zone tactile minimale (px) pour un pouce pressé. */
export const EMPLOYEE_TOUCH_MIN = 56;
export const EMPLOYEE_CARD_RADIUS = "20px";

export const employeeCardSx = {
  bgcolor: "background.paper",
  borderRadius: EMPLOYEE_CARD_RADIUS,
  border: `1px solid ${alpha(EMPLOYEE_INK, 0.06)}`,
  boxShadow: `0 1px 2px ${alpha(EMPLOYEE_INK, 0.04)}, 0 8px 24px ${alpha(EMPLOYEE_INK, 0.06)}`,
} as const;

/** Gros bouton d'action principal (ex. « ביצוע משימה »). */
export const employeeBigButtonSx = {
  minHeight: 60,
  px: 3,
  fontSize: "1.2rem",
  fontWeight: 800,
  borderRadius: "16px",
  letterSpacing: "-0.01em",
} as const;

export const employeeSectionTitleSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  mb: 1.25,
  px: 0.5,
  fontSize: "1.05rem",
  fontWeight: 800,
  color: "text.primary",
} as const;

/** Champs de formulaire : grande zone de saisie, texte lisible. */
export const employeeFieldSx = {
  "& .MuiOutlinedInput-root": { minHeight: 56, borderRadius: "14px", fontSize: "1.05rem" },
  "& .MuiInputLabel-root": { fontSize: "1rem" },
} as const;

/** Bouton principal plein, couleurs de la marque. */
export const employeePrimaryButtonSx = {
  ...employeeBigButtonSx,
  color: "#fff",
  background: EMPLOYEE_BRAND_GRADIENT,
  "&:hover": { background: EMPLOYEE_BRAND_GRADIENT, filter: "brightness(0.95)", transform: "none" },
  "&.Mui-disabled": { color: "rgba(255,255,255,0.75)", opacity: 0.6 },
} as const;
