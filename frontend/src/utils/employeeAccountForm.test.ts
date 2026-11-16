import { describe, expect, it } from "vitest";
import type { User } from "../services/api";
import type { Branch } from "../services/branchService";
import {
  addableEmployeeBranches,
  canAddToMyBranch,
  emptyEmployeeForm,
  employeeCreatePayload,
  employeeFormFromUser,
  employeeUpdatePayload,
} from "./employeeAccountForm";

const dana = {
  id: "u1", email: "dana", first_name: "דנה", last_name: "כהן", full_name: "דנה כהן", role: "employee", phone: null,
  job_function: "stockers", network_id: "n1", branch_id: "b1", is_active: true, email_verified: true, preferred_language: "ar",
  branches: [{ branch_id: "b1", branch_name: "TEST", is_primary: true }, { branch_id: "b2", branch_name: "שני", is_primary: false }],
} as User;
const branches = [{ id: "b1", name: "TEST" }, { id: "b2", name: "שני" }, { id: "b3", name: "שלישי" }] as Branch[];

describe("employeeAccountForm", () => {
  it("starts a new oved in the manager's snif, in Hebrew", () => {
    expect(emptyEmployeeForm("b1")).toMatchObject({ branch_id: "b1", job_function: "head_cashier", preferred_language: "he", password: "" });
  });

  it("fills the form from the account, without the password", () => {
    expect(employeeFormFromUser(dana)).toMatchObject({ email: "dana", first_name: "דנה", phone: "", job_function: "stockers", preferred_language: "ar", password: "" });
  });

  it("sends no password nor snif on update, and an empty phone as missing", () => {
    const payload = employeeUpdatePayload({ ...employeeFormFromUser(dana), password: "x", branch_id: "b9" });
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("branch_id");
    expect(payload.phone).toBeUndefined();
  });

  it("sends the snif on creation only for the network manager", () => {
    const form = { ...emptyEmployeeForm("b2"), email: "new", password: "secret1" };
    expect(employeeCreatePayload(form, true)).toMatchObject({ password: "secret1", branch_id: "b2" });
    expect(employeeCreatePayload(form, false).branch_id).toBeUndefined();
  });

  it("offers only the snifim the oved is not in yet", () => {
    expect(addableEmployeeBranches(dana, branches).map((b) => b.id)).toEqual(["b3"]);
    expect(addableEmployeeBranches(null, branches)).toEqual([]);
  });

  it("lets a branch manager attach an oved of another snif to his own", () => {
    expect(canAddToMyBranch(dana, "b3")).toBe(true);
    expect(canAddToMyBranch(dana, "b2")).toBe(false);
    expect(canAddToMyBranch(dana, null)).toBe(false);
  });
});
