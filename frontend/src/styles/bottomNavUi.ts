import { alpha } from "@mui/material";
import { systemBottomInsetCss } from "../utils/systemInsets";
import { EMPLOYEE_BRAND, EMPLOYEE_INK } from "./employeeUi";

/** Styles partagés des barres de navigation du bas (oved + manager). */

export function bottomNavActionSx(iconSize = 30) {
  return {
    minWidth: 0,
    gap: 0.25,
    color: alpha(EMPLOYEE_INK, 0.55),
    "& .MuiSvgIcon-root": { fontSize: iconSize },
    "& .MuiBottomNavigationAction-label": {
      fontSize: "0.9rem",
      fontWeight: 700,
      "&.Mui-selected": { fontSize: "0.9rem" },
    },
    "&.Mui-selected": {
      color: EMPLOYEE_BRAND,
      "& .MuiSvgIcon-root": {
        bgcolor: alpha(EMPLOYEE_BRAND, 0.12),
        borderRadius: "14px",
        width: 56,
        height: 34,
        p: "2px 13px",
        boxSizing: "border-box",
      },
    },
  } as const;
}

export const bottomNavBarSx = {
  width: "100%",
  maxWidth: 560,
  pointerEvents: "auto",
  borderRadius: "22px 22px 0 0",
  borderTop: `1px solid ${alpha(EMPLOYEE_INK, 0.08)}`,
  boxShadow: `0 -8px 28px ${alpha(EMPLOYEE_INK, 0.1)}`,
  transform: "translateZ(0)",
  pb: systemBottomInsetCss(),
} as const;

/** Rail fixe plein écran ; la barre reste centrée et lisible sur tablette. */
export const bottomNavRailSx = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: (t: { zIndex: { appBar: number } }) => t.zIndex.appBar,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
} as const;
