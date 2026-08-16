import { describe, expect, it } from "vitest";
import { managerWelcomeSubtitle } from "./managerWelcomeSubtitle";

describe("managerWelcomeSubtitle", () => {
  it("returns welcome with network in parentheses", () => {
    expect(managerWelcomeSubtitle("דני כהן", "רשת עלי")).toBe("שלום, דני כהן (רשת עלי)");
  });

  it("omits parentheses when no network", () => {
    expect(managerWelcomeSubtitle("דני כהן", null)).toBe("שלום, דני כהן");
    expect(managerWelcomeSubtitle("דני כהן", "  ")).toBe("שלום, דני כהן");
  });

  it("returns undefined without name", () => {
    expect(managerWelcomeSubtitle("", "רשת")).toBeUndefined();
    expect(managerWelcomeSubtitle(null)).toBeUndefined();
  });
});
