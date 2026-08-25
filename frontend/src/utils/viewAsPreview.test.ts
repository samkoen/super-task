import { describe, expect, it } from "vitest";
import { isViewAsPreview, viewAsEmployeeName } from "./viewAsPreview";
import type { User } from "../services/api";

const employee = {
  id: "e1",
  full_name: "  דני עובד  ",
  is_preview: true,
} as User;

describe("viewAsPreview", () => {
  it("detects preview mode", () => {
    expect(isViewAsPreview(employee)).toBe(true);
    expect(isViewAsPreview({ ...employee, is_preview: false })).toBe(false);
    expect(isViewAsPreview(null)).toBe(false);
  });

  it("trims the employee name", () => {
    expect(viewAsEmployeeName(employee)).toBe("דני עובד");
    expect(viewAsEmployeeName(null)).toBe("");
  });
});
