import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_CHAT_BAR_GAP_PX,
  EMPLOYEE_CHAT_BAR_HEIGHT_PX,
  EMPLOYEE_CHAT_BAR_OFFSET_PX,
  EMPLOYEE_CHAT_BAR_SPACER_PX,
  employeeChatBarPaperSx,
  employeeChatBarSpacerSx,
} from "./employeeChatBar";

describe("employeeChatBar", () => {
  it("uses a plain pixel spacer Android WebView cannot drop", () => {
    const sx = employeeChatBarSpacerSx();
    expect(sx.height).toBe(EMPLOYEE_CHAT_BAR_SPACER_PX);
    expect(sx.minHeight).toBe(EMPLOYEE_CHAT_BAR_SPACER_PX);
    expect(EMPLOYEE_CHAT_BAR_SPACER_PX).toBeGreaterThan(
      EMPLOYEE_CHAT_BAR_HEIGHT_PX + EMPLOYEE_CHAT_BAR_OFFSET_PX,
    );
  });

  it("keeps the שיחה control off the accordion hit area", () => {
    const paper = employeeChatBarPaperSx();
    expect(paper.insetInlineEnd).toBe("auto");
    expect(paper.maxWidth).toBe(200);
    expect(paper.bottom).toBe(EMPLOYEE_CHAT_BAR_OFFSET_PX);
    expect(EMPLOYEE_CHAT_BAR_GAP_PX).toBeGreaterThan(48);
  });
});
