import { assigneeOptionLabel, assigneesForBranch, withSelfAssignee } from "./assigneeOptions";
import { he } from "../i18n/he";
import type { User } from "../services/api";

function user(id: string, branchId = "b1"): User {
  return {
    id,
    email: `${id}@x`,
    first_name: id,
    last_name: "",
    full_name: id,
    role: id === "m1" ? "branch_manager" : "employee",
    phone: null,
    job_function: null,
    network_id: "n1",
    branch_id: branchId,
    is_active: true,
    email_verified: true,
  };
}

describe("assigneeOptions", () => {
  it("prepends the current menahel when missing from the roster", () => {
    const self = user("m1");
    const next = withSelfAssignee([user("e1")], self);
    expect(next.map((u) => u.id)).toEqual(["m1", "e1"]);
    expect(withSelfAssignee(next, self).map((u) => u.id)).toEqual(["m1", "e1"]);
  });

  it("keeps the menahel when filtering another branch", () => {
    const list = [user("m1"), user("e1")];
    expect(assigneesForBranch(list, "b2", "m1").map((u) => u.id)).toEqual(["m1"]);
    expect(assigneeOptionLabel(user("m1"), "m1")).toBe(`m1 (${he.assignToMyself})`);
  });
});
