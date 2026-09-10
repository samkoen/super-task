/** Marge sous שיחה pour la barre Android — px simples, pas de calc(). */
export const EMPLOYEE_CHAT_BAR_AFTER_PX = 96;

export function employeeChatBarSpacerSx() {
  return {
    height: EMPLOYEE_CHAT_BAR_AFTER_PX,
    minHeight: EMPLOYEE_CHAT_BAR_AFTER_PX,
    flexShrink: 0,
  } as const;
}

/** Dans le flux, sous l’accordéon : plus de calque fixe qui le recouvre. */
export function employeeChatBarPaperSx() {
  return {
    position: "relative" as const,
    mt: 2,
    width: "100%",
    maxWidth: 520,
    mx: "auto",
    borderRadius: 3,
    p: 1.25,
    border: "1px solid",
    borderColor: "divider",
  };
}
