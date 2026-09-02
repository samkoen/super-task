import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeChromeMenu from "./EmployeeChromeMenu";
import { he } from "../../i18n/he";
import type { User } from "../../services/api";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  exitViewAs: vi.fn(),
  user: {
    id: "u1",
    full_name: "דני עובד",
    role: "employee",
    is_preview: false,
  } as User,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    exitViewAs: mocks.exitViewAs,
  }),
}));

vi.mock("./ViewAsEmployeeDialog", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div>view-as-dialog</div> : null,
}));

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: he.mainMenu }));
}

describe("EmployeeChromeMenu", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.exitViewAs.mockReset();
    mocks.user.role = "employee";
    mocks.user.is_preview = false;
  });
  it("hides view-as tools for a regular oved", () => {
    mocks.user.role = "employee";
    mocks.user.is_preview = false;
    render(<EmployeeChromeMenu onLogout={() => {}} />);
    openMenu();
    expect(screen.getByRole("menuitem", { name: he.myAccount })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: he.logout })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: he.viewAsEmployee })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: he.managerArea })).toBeNull();
  });

  it("lets a branch manager open view-as and go to management", () => {
    mocks.user.role = "branch_manager";
    mocks.user.is_preview = false;
    render(<EmployeeChromeMenu onLogout={() => {}} />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: he.viewAsEmployee }));
    expect(screen.getByText("view-as-dialog")).toBeTruthy();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: he.managerArea }));
    expect(mocks.navigate).toHaveBeenCalledWith("/manager");
  });

  it("exits preview from the hamburger instead of a top banner", async () => {
    mocks.user.role = "employee";
    mocks.user.is_preview = true;
    mocks.exitViewAs.mockResolvedValue(undefined);
    render(<EmployeeChromeMenu onLogout={() => {}} />);
    openMenu();
    expect(screen.queryByRole("menuitem", { name: he.viewAsEmployee })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: he.viewAsExit }));
    await waitFor(() => {
      expect(mocks.exitViewAs).toHaveBeenCalledTimes(1);
    });
  });
});
