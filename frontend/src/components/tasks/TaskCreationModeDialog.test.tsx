import { describe, expect, it } from "vitest";
import { he } from "../../i18n/he";

/** Ancien dialogue 3 modes remplacé par משימה חדשה / משימה מהגלריה. */
describe("new task entry labels", () => {
  it("exposes the two primary create actions", () => {
    expect(he.newTask).toBe("משימה חדשה");
    expect(he.newTaskFromGallery).toBe("משימה מהגלריה");
  });
});
