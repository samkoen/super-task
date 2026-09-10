import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_CHAT_BAR_GAP_PX,
  EMPLOYEE_CHAT_BAR_HEIGHT_PX,
  EMPLOYEE_CHAT_BAR_OFFSET_PX,
  employeeChatBarBottomCss,
  employeeChatBarContentPadCss,
} from "./employeeChatBar";

describe("employeeChatBar", () => {
  it("keeps the completed accordion above the שיחה bar", () => {
    const pad = employeeChatBarContentPadCss();
    expect(pad).toContain("env(safe-area-inset-bottom");
    expect(pad).toContain("--app-nav-bottom");
    expect(pad).toContain(
      `${EMPLOYEE_CHAT_BAR_OFFSET_PX + EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_GAP_PX}px`,
    );
    expect(employeeChatBarBottomCss()).toContain(`${EMPLOYEE_CHAT_BAR_OFFSET_PX}px`);
  });

  it("leaves more room than the bar itself", () => {
    const padPx = EMPLOYEE_CHAT_BAR_OFFSET_PX + EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_GAP_PX;
    expect(padPx).toBeGreaterThan(EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_OFFSET_PX);
  });
});
