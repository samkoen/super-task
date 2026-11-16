import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "../../../services/api";
import { he } from "../../../i18n/he";
import type { EmployeeAccounts } from "../../../hooks/useEmployeeAccounts";
import EmployeeAccountSheet from "./EmployeeAccountSheet";
import { EmployeeAccessDialog, EmployeePasswordDialog } from "./EmployeeAccountDialogs";
import EmployeeFormDialog from "./EmployeeFormDialog";

const auth = { user: { id: "m1", role: "network_manager", branch_id: null as string | null } };
const feedback = { showSuccess: vi.fn(), showError: vi.fn() };
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../../../services/userService", () => ({ userService: { addTeamEmployeeMembership: vi.fn(), deleteTeamAvatar: vi.fn() } }));

const dana = {
  id: "u1", email: "dana", first_name: "דנה", last_name: "כהן", full_name: "דנה כהן", role: "employee", phone: "050", job_function: "stockers",
  branch_id: "b1", is_active: true, branches: [{ branch_id: "b1", branch_name: "TEST", is_primary: true }],
} as User;
const branches = [{ id: "b1", name: "TEST" }, { id: "b2", name: "שני" }] as never;

function accounts(patch: Partial<EmployeeAccounts> = {}): EmployeeAccounts {
  return {
    form: null, openCreate: vi.fn(), openEdit: vi.fn(), closeForm: vi.fn(), access: null, openAccess: vi.fn(), closeAccess: vi.fn(),
    toggleAccess: vi.fn(), password: null, openPassword: vi.fn(), closePassword: vi.fn(), resetPassword: vi.fn(), saving: false,
    save: vi.fn(), run: vi.fn(async (call: () => Promise<unknown>) => call()), viewAs: vi.fn(), ...patch,
  } as unknown as EmployeeAccounts;
}

describe("employee account management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: "m1", role: "network_manager", branch_id: null };
  });

  it("lists the account actions and closes the sheet before opening one", () => {
    const acc = accounts();
    const onClose = vi.fn();
    render(<EmployeeAccountSheet user={dana} accounts={acc} onClose={onClose} />);
    expect(screen.getByText(/dana · 050/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("employee-account-edit"));
    expect(onClose).toHaveBeenCalled();
    expect(acc.openEdit).toHaveBeenCalledWith(dana);
    fireEvent.click(screen.getByTestId("employee-account-access"));
    expect(acc.openAccess).toHaveBeenCalledWith(dana);
    fireEvent.click(screen.getByTestId("employee-account-view-as"));
    expect(acc.viewAs).toHaveBeenCalledWith(dana);
  });

  it("does not offer « view as » for a closed account nor cutting one's own access", () => {
    auth.user = { id: "u1", role: "network_manager", branch_id: null };
    render(<EmployeeAccountSheet user={{ ...dana, is_active: false }} accounts={accounts()} onClose={vi.fn()} />);
    expect(screen.queryByTestId("employee-account-view-as")).toBeNull();
    expect(screen.queryByTestId("employee-account-access")).toBeNull();
  });

  it("confirms the access change", () => {
    const acc = accounts({ access: dana });
    render(<EmployeeAccessDialog accounts={acc} />);
    expect(screen.getByText(he.confirmRevokeAppAccess)).toBeTruthy();
    fireEvent.click(screen.getByTestId("employee-access-confirm"));
    expect(acc.toggleAccess).toHaveBeenCalled();
  });

  it("refuses two different passwords", () => {
    const acc = accounts({ password: dana });
    render(<EmployeePasswordDialog accounts={acc} />);
    fireEvent.change(screen.getByLabelText(new RegExp(he.newPassword)), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(new RegExp(he.confirmPassword)), { target: { value: "abc124" } });
    fireEvent.click(screen.getByTestId("employee-password-submit"));
    expect(feedback.showError).toHaveBeenCalledWith(he.passwordMismatch);
    expect(acc.resetPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(new RegExp(he.confirmPassword)), { target: { value: "abc123" } });
    fireEvent.click(screen.getByTestId("employee-password-submit"));
    expect(acc.resetPassword).toHaveBeenCalledWith("abc123");
  });

  it("keeps the typing when the edited account is refreshed (a snif was added)", () => {
    const acc = accounts({ form: { edit: dana } });
    const { rerender } = render(<EmployeeFormDialog accounts={acc} branches={branches} />);
    fireEvent.change(screen.getByLabelText(new RegExp(he.firstName)), { target: { value: "דנית" } });
    const refreshed = { ...dana, branches: [...dana.branches!, { branch_id: "b2", branch_name: "שני", is_primary: false }] };
    rerender(<EmployeeFormDialog accounts={{ ...acc, form: { edit: refreshed } }} branches={branches} />);
    expect((screen.getByLabelText(new RegExp(he.firstName)) as HTMLInputElement).value).toBe("דנית");
    expect(screen.getByText("שני")).toBeTruthy();
  });

  it("edits an oved with his values", () => {
    const acc = accounts({ form: { edit: dana } });
    render(<EmployeeFormDialog accounts={acc} branches={branches} />);
    const first = screen.getByLabelText(new RegExp(he.firstName)) as HTMLInputElement;
    expect(first.value).toBe("דנה");
    expect(screen.queryByLabelText(new RegExp(he.password))).toBeNull();
    fireEvent.change(first, { target: { value: "דנית" } });
    fireEvent.click(screen.getByTestId("employee-form-submit"));
    expect(acc.save).toHaveBeenCalledWith(dana, expect.objectContaining({ first_name: "דנית" }), null);
  });

  it("asks the network manager for the snif of a new oved", () => {
    render(<EmployeeFormDialog accounts={accounts({ form: { edit: null } })} branches={branches} />);
    expect(screen.getByText(he.newEmployee)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(he.password))).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^${he.branch}`))).toBeTruthy();
  });

  it("does not ask the branch manager for a snif", async () => {
    auth.user = { id: "m2", role: "branch_manager", branch_id: "b1" };
    const acc = accounts({ form: { edit: null } });
    render(<EmployeeFormDialog accounts={acc} branches={[]} />);
    expect(screen.queryByLabelText(new RegExp(`^${he.branch}`))).toBeNull();
    fireEvent.click(screen.getByTestId("employee-form-submit"));
    await waitFor(() => expect(acc.save).toHaveBeenCalledWith(null, expect.objectContaining({ branch_id: "b1" }), null));
  });
});
