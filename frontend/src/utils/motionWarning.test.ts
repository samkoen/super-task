import { describe, expect, it } from "vitest";
import { WARNING_HOLD_MS, createMotionMonitor, rotationMagnitude } from "./motionWarning";

describe("motionWarning", () => {
  it("computes the rotation speed and tolerates missing values", () => {
    expect(rotationMagnitude({ alpha: 3, beta: 4, gamma: 0 })).toBe(5);
    expect(rotationMagnitude({ alpha: null })).toBe(0);
    expect(rotationMagnitude(null)).toBe(0);
  });

  it("ignores a single spike", () => {
    const monitor = createMotionMonitor(100);
    expect(monitor.push(300, 0)).toBe(false);
    expect(monitor.push(10, 16)).toBe(false);
  });

  it("warns after sustained fast motion and keeps the warning briefly", () => {
    const monitor = createMotionMonitor(100);
    let shown = false;
    for (let i = 0; i < 4; i += 1) shown = monitor.push(200, i * 16);
    expect(shown).toBe(true);
    expect(monitor.push(5, 100)).toBe(true);
    expect(monitor.push(5, 48 + WARNING_HOLD_MS + 1)).toBe(false);
  });

  it("clears on reset", () => {
    const monitor = createMotionMonitor(100);
    for (let i = 0; i < 4; i += 1) monitor.push(200, i);
    monitor.reset();
    expect(monitor.push(5, 10)).toBe(false);
  });
});
