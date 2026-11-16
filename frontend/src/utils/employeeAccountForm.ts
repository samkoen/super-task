/** Compte d'un oved (création / modification depuis l'onglet « צוות ») : règles pures du formulaire. */
import type { JobFunction, User } from "../services/api";
import type { Branch } from "../services/branchService";
import type { TeamEmployeePayload } from "../services/userService";
import type { EmployeeLanguage } from "../domain/employeeLanguages";
import { userBelongsToBranch } from "./userBranchMembership";

export const EMPLOYEE_JOB_FUNCTIONS: JobFunction[] = ["head_cashier", "stockers", "warehouse_worker"];

export interface EmployeeAccountForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  job_function: JobFunction;
  branch_id: string;
  preferred_language: EmployeeLanguage;
}

/** Nouvel oved : le snif du menahel snif est imposé, le menahel reshet le choisit. */
export function emptyEmployeeForm(branchId = ""): EmployeeAccountForm {
  return { email: "", password: "", first_name: "", last_name: "", phone: "", job_function: "head_cashier", branch_id: branchId, preferred_language: "he" };
}

export function employeeFormFromUser(user: User): EmployeeAccountForm {
  return {
    email: user.email,
    password: "",
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone ?? "",
    job_function: user.job_function ?? "head_cashier",
    branch_id: user.branch_id ?? "",
    preferred_language: (user.preferred_language ?? "he") as EmployeeLanguage,
  };
}

/** Modification : ni mot de passe ni snif (le snif s'ajoute par une adhésion). */
export function employeeUpdatePayload(form: EmployeeAccountForm): TeamEmployeePayload {
  return {
    email: form.email,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone || undefined,
    job_function: form.job_function,
    preferred_language: form.preferred_language,
  };
}

/** Création : le snif n'est envoyé que par le menahel reshet (le backend impose celui du menahel snif). */
export function employeeCreatePayload(form: EmployeeAccountForm, sendBranch: boolean): TeamEmployeePayload {
  return { ...employeeUpdatePayload(form), password: form.password, branch_id: sendBranch ? form.branch_id : undefined };
}

/** Snifim que le menahel reshet peut encore ajouter à cet oved. */
export function addableEmployeeBranches(user: User | null, branches: Branch[]): Branch[] {
  if (!user) return [];
  const existing = new Set((user.branches ?? []).map((b) => b.branch_id).concat(user.branch_id ? [user.branch_id] : []));
  return branches.filter((b) => !existing.has(b.id));
}

/** Menahel snif : peut rattacher à son snif un oved venu d'un autre snif. */
export function canAddToMyBranch(user: User | null, myBranchId: string | null | undefined): boolean {
  return Boolean(user && myBranchId && !userBelongsToBranch(user, myBranchId));
}
