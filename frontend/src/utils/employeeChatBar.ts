/** Hauteur barre שיחה (px), hors safe-area. */
export const EMPLOYEE_CHAT_BAR_HEIGHT_PX = 80;
/** Marge sous l’accordéon — px simples : calc() est souvent ignoré sur Android. */
export const EMPLOYEE_CHAT_BAR_GAP_PX = 72;
export const EMPLOYEE_CHAT_BAR_OFFSET_PX = 24;
export const EMPLOYEE_CHAT_BAR_SPACER_PX =
  EMPLOYEE_CHAT_BAR_OFFSET_PX + EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_GAP_PX;

export function employeeChatBarSpacerSx() {
  return {
    height: EMPLOYEE_CHAT_BAR_SPACER_PX,
    minHeight: EMPLOYEE_CHAT_BAR_SPACER_PX,
    flexShrink: 0,
  } as const;
}

/** Coin bas, pas pleine largeur — l’accordéon reste cliquable. */
export function employeeChatBarPaperSx() {
  return {
    position: "fixed" as const,
    bottom: EMPLOYEE_CHAT_BAR_OFFSET_PX,
    insetInlineStart: 16,
    insetInlineEnd: "auto",
    width: "auto",
    maxWidth: 200,
    zIndex: 1200,
    borderRadius: 3,
    p: 1,
    border: "1px solid",
    borderColor: "divider",
  };
}
