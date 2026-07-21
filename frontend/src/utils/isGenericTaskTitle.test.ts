import { describe, expect, it } from "vitest";
import { isGenericTaskTitle } from "./isGenericTaskTitle";

describe("isGenericTaskTitle", () => {
  it("flags kind labels as generic", () => {
    expect(isGenericTaskTitle("משימה מזדמנת")).toBe(true);
    expect(isGenericTaskTitle("משימה קבועה")).toBe(true);
    expect(isGenericTaskTitle("")).toBe(true);
  });

  it("keeps real operational titles", () => {
    expect(isGenericTaskTitle("ניקוי מדף חלב")).toBe(false);
    expect(isGenericTaskTitle("סידור קופה")).toBe(false);
  });
});
