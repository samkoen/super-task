import { describe, expect, it } from "vitest";
import { isSystemBugUi } from "./systemBugCapture";

describe("isSystemBugUi", () => {
  it("skips the discreet report button in screenshots", () => {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-system-bug-ignore", "");
    const icon = document.createElement("span");
    wrap.appendChild(icon);
    expect(isSystemBugUi(wrap)).toBe(true);
    expect(isSystemBugUi(icon)).toBe(true);
    expect(isSystemBugUi(document.createElement("div"))).toBe(false);
  });
});
