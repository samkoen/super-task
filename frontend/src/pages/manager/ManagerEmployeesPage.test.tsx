import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { dashboardService } from "../../services/dashboardService";
import { userService } from "../../services/userService";
import { he } from "../../i18n/he";
import ManagerEmployeesPage from "./ManagerEmployeesPage";

const auth = { user: { id: "m1", role: "network_manager", branch_id: null as string | null, branch_name: null as string | null }, viewAs: vi.fn() };
const feedback = { showSuccess: vi.fn(), showError: vi.fn() };
const header = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../../context/ManagerPageHeaderContext", () => ({ useManagerPageHeader: (title: string, subtitle?: string) => header(title, subtitle) }));
vi.mock("../../hooks/useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../../services/dashboardService", () => ({ dashboardService: { getManager: vi.fn() } }));
vi.mock("../../services/userService", () => ({ userService: { listTeam: vi.fn() } }));
vi.mock("../../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([{ id: "b1", name: "TEST" }, { id: "b2", name: "שני" }]) } }));
vi.mock("../../components/team/ManagerEmployeeSheet", () => ({
  default: ({ entry, onAccount }: { entry: { id: string; user: unknown } | null; onAccount?: (e: unknown) => void }) =>
    entry ? <div data-testid="sheet">{entry.id}{onAccount ? <button onClick={() => onAccount(entry)}>account</button> : null}</div> : null,
}));

const users = [
  { id: "u1", full_name: "שמואל", role: "employee", branch_id: "b1", is_active: true, email: "s" },
  { id: "u2", full_name: "דנה", role: "employee", branch_id: "b2", is_active: false, email: "d" },
];

function renderPage(path = "/manager/employees?branch=b1") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/manager/employees" element={<ManagerEmployeesPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe("ManagerEmployeesPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    header.mockReset();
    auth.user = { id: "m1", role: "network_manager", branch_id: null, branch_name: null };
    vi.mocked(userService.listTeam).mockReset().mockResolvedValue(users as never);
    vi.mocked(dashboardService.getManager).mockReset().mockResolvedValue({
      team: [{ user_id: "u1", full_name: "שמואל", status: "in_progress", current_task_title: "ספירה", completed_today: 0, total_today: 2, timeline: [], overdue_backlog: [] }],
    } as never);
  });

  it("shows the team of the snif by state, with the snif in the title", async () => {
    renderPage();
    const row = await screen.findByTestId("team-row-u1");
    expect(row.textContent).toContain("ספירה");
    expect(screen.queryByTestId("team-row-u2")).toBeNull();
    expect(header).toHaveBeenLastCalledWith(he.managerTeamTitle, `TEST · ${he.managerTeamCount(1)}`);
  });

  it("shows the whole network with each oved's snif, and says how to see who works", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue({ team: null } as never);
    renderPage("/manager/employees");
    await screen.findByTestId("team-row-u2");
    expect(screen.getByTestId("team-no-live").textContent).toBe(he.managerTeamNoLiveStatus);
    expect(screen.getByTestId("team-section-noAccess")).toBeTruthy();
  });

  it("opens the employee sheet from a row", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("team-row-u1"));
    expect(screen.getByTestId("sheet").textContent).toContain("u1");
  });

  it("reopens the sheet of the oved in the address (after creating a task for him)", async () => {
    renderPage("/manager/employees?branch=b1&employee=u1");
    expect((await screen.findByTestId("sheet")).textContent).toContain("u1");
  });

  it("opens the account management of the oved from his sheet", async () => {
    renderPage("/manager/employees?branch=b1&employee=u1");
    fireEvent.click(await screen.findByText("account"));
    const sheet = await screen.findByTestId("employee-account-sheet");
    expect(within(sheet).getByTestId("employee-account-edit")).toBeTruthy();
  });

  it("creates a new oved from a discreet button", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("team-new-employee"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText(he.newEmployee).length).toBeGreaterThan(1);
  });
});
