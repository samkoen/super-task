import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeeBottomNav from "./EmployeeBottomNav";
import { he } from "../../i18n/he";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "employee" } }),
}));

vi.mock("../../hooks/useEmployeeChatUnread", () => ({
  useEmployeeChatUnread: () => 3,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <EmployeeBottomNav />
    </MemoryRouter>,
  );
}

describe("EmployeeBottomNav", () => {
  beforeEach(() => navigate.mockClear());

  it("shows the three big tabs with the current one selected", () => {
    renderAt("/employee");
    const tasks = screen.getByRole("button", { name: he.employeeBottomNavTasks });
    expect(tasks.className).toContain("Mui-selected");
    expect(screen.getByRole("button", { name: he.employeeBottomNavChats })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.employeeBottomNavAccount })).toBeTruthy();
  });

  it("opens the chats from the middle tab", () => {
    renderAt("/employee");
    fireEvent.click(screen.getByRole("button", { name: he.employeeBottomNavChats }));
    expect(navigate).toHaveBeenCalledWith("/employee/chats");
  });

  it("shows the unread count on the chat tab", () => {
    renderAt("/employee/account");
    expect(screen.getByText("3")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: he.employeeBottomNavAccount }).className,
    ).toContain("Mui-selected");
  });
});
