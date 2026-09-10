import { withSystemBottomInsetCss } from "./systemInsets";

/** Hauteur barre שיחה (px), hors safe-area. */
export const EMPLOYEE_CHAT_BAR_HEIGHT_PX = 80;
/** Marge sous l’accordéon משימות שהושלמו pour ne pas être sous le bouton. */
export const EMPLOYEE_CHAT_BAR_GAP_PX = 48;
/** Distance du bord bas. */
export const EMPLOYEE_CHAT_BAR_OFFSET_PX = 16;

export function employeeChatBarBottomCss(): string {
  return withSystemBottomInsetCss(`${EMPLOYEE_CHAT_BAR_OFFSET_PX}px`);
}

/** Spacer réel : le pb du scroller est souvent ignoré par WebView Android. */
export function employeeChatBarContentPadCss(): string {
  const base =
    EMPLOYEE_CHAT_BAR_OFFSET_PX + EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_GAP_PX;
  return withSystemBottomInsetCss(`${base}px`);
}
