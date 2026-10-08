import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeProfilePage from "./EmployeeProfilePage";
import { he } from "../../i18n/he";
import { authService } from "../../services/authService";

const refresh = vi.fn();
const logout = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();

const user = {
  id: "u1",
  full_name: "דנה כהן",
  first_name: "דנה",
  last_name: "כהן",
  email: "d@x.co",
  phone: "050",
  role: "employee",
  avatar_url: null,
  excellence_slogan: null,
  preferred_language: "he",
};

let currentUser: typeof user | null = user;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, refresh, logout }),
}));

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showSuccess, showError }),
}));

vi.mock("../../services/authService", () => ({
  authService: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    stylizeAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}));

vi.mock("../../components/employee/EmployeeAvatarCapture", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>avatar-capture-open</div> : null),
}));

vi.mock("../../components/appUpdate/AppUpdateCard", () => ({ default: () => null }));
vi.mock("../../components/tasks/AgrolineConnectionCard", () => ({
  default: () => <div>agroline-card</div>,
}));

describe("EmployeeProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = user;
    refresh.mockResolvedValue(undefined);
  });

  it("offers the Agroline connection to the oved too", () => {
    render(<EmployeeProfilePage />);
    expect(screen.getByText("agroline-card")).toBeTruthy();
  });

  it("saves the edited profile", async () => {
    vi.mocked(authService.updateProfile).mockResolvedValue({ message: "נשמר" } as never);
    render(<EmployeeProfilePage />);
    fireEvent.change(screen.getByLabelText(new RegExp(he.firstName)), { target: { value: "יעל" } });
    fireEvent.click(screen.getByRole("button", { name: he.saveProfile }));
    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: "יעל", last_name: "כהן" }),
      ),
    );
    await waitFor(() => expect(showSuccess).toHaveBeenCalledWith("נשמר"));
  });

  it("refuses a password change when the confirmation differs", async () => {
    render(<EmployeeProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: he.changePassword }));
    fireEvent.change(screen.getByLabelText(new RegExp(he.currentPassword)), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText(new RegExp(he.newPassword)), { target: { value: "abc12345" } });
    fireEvent.change(screen.getByLabelText(new RegExp(he.confirmPassword)), { target: { value: "other" } });
    const buttons = screen.getAllByRole("button", { name: he.changePassword });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(showError).toHaveBeenCalledWith(he.passwordMismatch);
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it("opens the photo capture from the hero", () => {
    render(<EmployeeProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: he.employeeChangePhoto }));
    expect(screen.getByText("avatar-capture-open")).toBeTruthy();
  });

  it("logs out from the page", () => {
    render(<EmployeeProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: he.logout }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows a spinner while the user is loading", () => {
    currentUser = null;
    render(<EmployeeProfilePage />);
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
});
