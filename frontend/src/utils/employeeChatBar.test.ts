import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_CHAT_BAR_AFTER_PX,
  employeeChatBarPaperSx,
  employeeChatBarSpacerSx,
} from "./employeeChatBar";

describe("employeeChatBar", () => {
  it("sits in the document flow under the completed accordion", () => {
    const paper = employeeChatBarPaperSx();
    expect(paper.position).toBe("relative");
    expect(paper.width).toBe("100%");
    expect(paper.maxWidth).toBe(520);
  });

  it("leaves a numeric gap under שיחה for the Android nav", () => {
    const sx = employeeChatBarSpacerSx();
    expect(sx.height).toBe(EMPLOYEE_CHAT_BAR_AFTER_PX);
    expect(sx.minHeight).toBe(EMPLOYEE_CHAT_BAR_AFTER_PX);
    expect(EMPLOYEE_CHAT_BAR_AFTER_PX).toBeGreaterThanOrEqual(80);
  });
});
