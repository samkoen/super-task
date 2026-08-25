import { describe, expect, it } from "vitest";
import { avatarInitials } from "./avatarInitials";

describe("avatarInitials", () => {
  it("uses first and last name letters", () => {
    expect(avatarInitials("אחמד קאטוש")).toBe("אק");
  });

  it("uses two letters when a single word", () => {
    expect(avatarInitials("דנה")).toBe("דנ");
  });

  it("returns empty for blank name", () => {
    expect(avatarInitials("  ")).toBe("");
  });
});
