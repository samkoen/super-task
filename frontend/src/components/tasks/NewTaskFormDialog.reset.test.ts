import { describe, expect, it } from "vitest";

/** Documente le bug : reset form seulement à l’ouverture, pas sur deps volatiles. */
describe("NewTaskFormDialog reset policy", () => {
  it("treats open false→true as the only init trigger", () => {
    const justOpened = (open: boolean, wasOpen: boolean) => open && !wasOpen;
    expect(justOpened(true, false)).toBe(true);
    expect(justOpened(true, true)).toBe(false);
    expect(justOpened(false, true)).toBe(false);
  });
});
