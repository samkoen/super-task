import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError, type User } from "../services/api";
import { userService } from "../services/userService";
import { he } from "../i18n/he";
import { emptyEmployeeForm } from "../utils/employeeAccountForm";
import { useEmployeeAccounts } from "./useEmployeeAccounts";

const auth = { user: { id: "m1", role: "network_manager", branch_id: null as string | null }, viewAs: vi.fn() };
const feedback = { showSuccess: vi.fn(), showError: vi.fn() };
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../services/userService", () => ({
  userService: {
    createTeamEmployee: vi.fn(), updateTeamEmployee: vi.fn(), uploadTeamAvatar: vi.fn(),
    setTeamEmployeeAccess: vi.fn(), resetTeamEmployeePassword: vi.fn(),
  },
}));

const dana = { id: "u1", full_name: "דנה", is_active: true } as User;

function setup() {
  const reload = vi.fn().mockResolvedValue(undefined);
  return { reload, result: renderHook(() => useEmployeeAccounts(reload)).result };
}

describe("useEmployeeAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: "m1", role: "network_manager", branch_id: null };
    vi.mocked(userService.createTeamEmployee).mockResolvedValue({ user: { id: "new" }, message: "" } as never);
    vi.mocked(userService.updateTeamEmployee).mockResolvedValue({ user: dana, message: "עודכן" } as never);
    vi.mocked(userService.setTeamEmployeeAccess).mockResolvedValue({ user: dana, message: "" } as never);
    vi.mocked(userService.resetTeamEmployeePassword).mockResolvedValue({ user: dana, message: "" } as never);
  });

  it("creates an oved in the chosen snif, uploads the photo and reloads", async () => {
    const { result, reload } = setup();
    act(() => result.current.openCreate());
    const photo = new File(["x"], "p.jpg");
    await act(() => result.current.save(null, { ...emptyEmployeeForm("b2"), email: "n", password: "secret1" }, photo));
    expect(userService.createTeamEmployee).toHaveBeenCalledWith(expect.objectContaining({ branch_id: "b2", password: "secret1" }));
    expect(userService.uploadTeamAvatar).toHaveBeenCalledWith("new", photo);
    expect(feedback.showSuccess).toHaveBeenCalledWith(he.employeeCreated);
    expect(result.current.form).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  it("updates an oved and keeps the form open on error", async () => {
    vi.mocked(userService.updateTeamEmployee).mockRejectedValue(new ApiError("כפול", 409));
    const { result, reload } = setup();
    act(() => result.current.openEdit(dana));
    await act(() => result.current.save(dana, emptyEmployeeForm(), null));
    expect(feedback.showError).toHaveBeenCalledWith("כפול");
    expect(result.current.form).toEqual({ edit: dana });
    expect(reload).not.toHaveBeenCalled();
  });

  it("cuts the access after confirmation", async () => {
    const { result } = setup();
    act(() => result.current.openAccess(dana));
    await act(() => result.current.toggleAccess());
    expect(userService.setTeamEmployeeAccess).toHaveBeenCalledWith("u1", false);
    expect(feedback.showSuccess).toHaveBeenCalledWith(he.employeeAccessRevoked);
    expect(result.current.access).toBeNull();
  });

  it("resets the password without reloading the list", async () => {
    const { result, reload } = setup();
    act(() => result.current.openPassword(dana));
    await act(() => result.current.resetPassword("newpass1"));
    expect(userService.resetTeamEmployeePassword).toHaveBeenCalledWith("u1", "newpass1");
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.password).toBeNull();
  });

  it("opens the app as the oved", async () => {
    const { result } = setup();
    await act(() => result.current.viewAs(dana));
    expect(auth.viewAs).toHaveBeenCalledWith("u1");
  });
});
