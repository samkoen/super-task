import { BREAK_CHANGE_EVENT } from "../constants/events";

export function shouldDeliverEmployeeAlert(
  onBreak: boolean,
  kind: string | undefined,
): boolean {
  if (!onBreak) return true;
  return kind === "break_override";
}

export function dispatchBreakChange(onBreak: boolean): void {
  window.dispatchEvent(
    new CustomEvent(BREAK_CHANGE_EVENT, { detail: { on_break: onBreak } }),
  );
}
