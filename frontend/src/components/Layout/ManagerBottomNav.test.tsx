import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagerBottomNav from "./ManagerBottomNav";
import { he } from "../../i18n/he";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("ManagerBottomNav", () => {
  it("navigates to tasks tab", () => {
    navigate.mockClear();
    render(
      <MemoryRouter initialEntries={["/manager"]}>
        <ManagerBottomNav forceVisible />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: he.managerBottomNavTasks }));
    expect(navigate).toHaveBeenCalledWith("/manager/tasks");
  });

  it("navigates to tasks with current snif when stored", () => {
    navigate.mockClear();
    sessionStorage.setItem("super.managerScopeBranch", "b42");
    render(
      <MemoryRouter initialEntries={["/manager"]}>
        <ManagerBottomNav forceVisible />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: he.managerBottomNavTasks }));
    expect(navigate).toHaveBeenCalledWith("/manager/tasks?branch=b42");
    sessionStorage.removeItem("super.managerScopeBranch");
  });
});
