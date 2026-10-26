import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ManagerFixedTaskDetailPage, { availableTabs } from "./ManagerFixedTaskDetailPage";
import { he } from "../../i18n/he";
import { ApiError } from "../../services/api";
import { fixedTaskService } from "../../services/fixedTaskService";
import { taskService } from "../../services/taskService";
import { userService } from "../../services/userService";
import { fixtureBranch, fixtureGroup } from "../../components/tasks/fixed/fixedTaskFixtures";

const { showError, showSuccess } = vi.hoisted(() => ({ showError: vi.fn(), showSuccess: vi.fn() }));

vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => ({ showError, showSuccess }) }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", role: "network_manager", full_name: "מנהל" } }),
}));
vi.mock("../../services/fixedTaskService", () => ({
  fixedTaskService: { get: vi.fn(), updateDefaults: vi.fn(), updateBranch: vi.fn() },
}));
vi.mock("../../services/taskService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/taskService")>()),
  taskService: { deleteTemplate: vi.fn() },
}));
vi.mock("../../services/userService", () => ({ userService: { listTeam: vi.fn() } }));
vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: { markTemplate: vi.fn(), linkCustomer: vi.fn() },
}));
vi.mock("../../components/tasks/TaskReferenceMediaEditor", () => ({
  default: () => null,
  resolveTaskReferenceMedia: async (m: unknown) => m,
}));
vi.mock("../../components/tasks/CompletionRequirementsEditor", () => ({ default: () => null }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/manager/fixed-tasks/g1"]}>
      <Routes>
        <Route path="/manager/fixed-tasks" element={<div data-testid="list-route" />} />
        <Route path="/manager/fixed-tasks/:key" element={<ManagerFixedTaskDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("availableTabs", () => {
  it("gives general + branches to a network manager on a network task", () => {
    expect(availableTabs({ is_network: true, can_edit_defaults: true })).toEqual(["general", "branches"]);
  });
  it("gives only branches to a branch manager on a network task", () => {
    expect(availableTabs({ is_network: true, can_edit_defaults: false })).toEqual(["branches"]);
  });
  it("gives only general for a single-branch task", () => {
    expect(availableTabs({ is_network: false, can_edit_defaults: true })).toEqual(["general"]);
  });
});

describe("ManagerFixedTaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.listTeam).mockResolvedValue([
      { id: "u1", full_name: "דנה", branch_id: "b1" } as never,
    ]);
  });

  it("shows the general settings with the impact on branches", async () => {
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup({ overridden_count: 1 }));
    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "בדיקת קירור" })).toBeTruthy());
    expect(screen.getByRole("tab", { name: he.fixedDetailTabGeneral })).toBeTruthy();
    expect(screen.getByTestId("fixed-impact").textContent).toBe(he.fixedDetailImpact(2, 1));
  });

  it("saves the general settings and reloads", async () => {
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup());
    vi.mocked(fixedTaskService.updateDefaults).mockResolvedValue(fixtureGroup());
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(he.taskTitle)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "כותרת חדשה" } });
    fireEvent.click(screen.getByRole("button", { name: he.fixedDetailSave }));
    await waitFor(() => expect(fixedTaskService.updateDefaults).toHaveBeenCalled());
    const [key, payload] = vi.mocked(fixedTaskService.updateDefaults).mock.calls[0];
    expect(key).toBe("g1");
    expect(payload.title).toBe("כותרת חדשה");
    expect("assignee_user_id" in payload).toBe(false);
    await waitFor(() => expect(showSuccess).toHaveBeenCalledWith(he.fixedDetailSaved));
  });

  it("switches to the branches tab and toggles a branch without touching the others", async () => {
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup());
    vi.mocked(fixedTaskService.updateBranch).mockResolvedValue(fixtureBranch());
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: he.fixedDetailTabBranches }));
    fireEvent.click((await screen.findAllByRole("checkbox"))[0]);
    await waitFor(() =>
      expect(fixedTaskService.updateBranch).toHaveBeenCalledWith("t1", { changes: { is_active: false } }),
    );
  });

  it("saves a branch adaptation from the sheet", async () => {
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup());
    vi.mocked(fixedTaskService.updateBranch).mockResolvedValue(fixtureBranch());
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: he.fixedDetailTabBranches }));
    fireEvent.click(await screen.findByRole("button", { name: he.fixedBranchSheetTitle("תל אביב") }));
    fireEvent.click(await screen.findByRole("checkbox", { name: `${he.fixedBranchCustomToggle}: ${he.dueTime}` }));
    fireEvent.change(screen.getByDisplayValue("09:00"), { target: { value: "07:30" } });
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchSave }));
    await waitFor(() =>
      expect(fixedTaskService.updateBranch).toHaveBeenCalledWith("t1", {
        changes: { due_time: "07:30" },
        reset: [],
      }),
    );
  });

  it("sends a reset when a branch goes back to the general proof requirements", async () => {
    const adapted = fixtureBranch({
      completion_requirements: [{ kind: "video", min_seconds: 5 }],
      overridden_fields: ["completion_requirements"],
    });
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup({ branches: [adapted], branch_count: 1 }));
    vi.mocked(fixedTaskService.updateBranch).mockResolvedValue(adapted);
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: he.fixedDetailTabBranches }));
    fireEvent.click(await screen.findByRole("button", { name: he.fixedBranchSheetTitle("תל אביב") }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: `${he.fixedBranchCustomToggle}: ${he.taskFormSectionProof}` }),
    );
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchSave }));
    await waitFor(() =>
      expect(fixedTaskService.updateBranch).toHaveBeenCalledWith("t1", {
        changes: {},
        reset: ["completion_requirements"],
      }),
    );
  });

  it("deletes the whole network task after confirmation and goes back to the list", async () => {
    vi.mocked(fixedTaskService.get).mockResolvedValue(fixtureGroup());
    vi.mocked(taskService.deleteTemplate).mockResolvedValue({ message: "", deleted_count: 2 });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: he.fixedDetailDeleteNetwork }));
    fireEvent.click(await screen.findByRole("button", { name: he.taskDeleteConfirm }));
    await waitFor(() => expect(taskService.deleteTemplate).toHaveBeenCalledWith("t1", true));
    await waitFor(() => expect(screen.getByTestId("list-route")).toBeTruthy());
  });

  it("shows an error message when the task cannot be loaded", async () => {
    vi.mocked(fixedTaskService.get).mockRejectedValue(new ApiError("אין הרשאה", 403));
    renderPage();
    await waitFor(() => expect(screen.getByText("אין הרשאה")).toBeTruthy());
  });
});
