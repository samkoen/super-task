import { describe, expect, it } from "vitest";
import { canManageAsTeamEmployee } from "./teamEmployeeActions";

describe("canManageAsTeamEmployee", () => {
  it("allows ovdim only, not snif menahelim", () => {
    expect(canManageAsTeamEmployee("employee")).toBe(true);
    expect(canManageAsTeamEmployee("branch_manager")).toBe(false);
    expect(canManageAsTeamEmployee("network_manager")).toBe(false);
  });
});
