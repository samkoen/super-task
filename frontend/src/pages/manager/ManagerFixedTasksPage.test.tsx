import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ManagerFixedTasksPage from "./ManagerFixedTasksPage";
import { he } from "../../i18n/he";
import { fixedTaskService } from "../../services/fixedTaskService";
import { userService } from "../../services/userService";
import { ApiError } from "../../services/api";
import { fixtureBranch, fixtureGroup } from "../../components/tasks/fixed/fixedTaskFixtures";
import {
  MANAGER_FIXED_TASKS_DRAFT_KEY,
  clearFixedTaskCreateDraft,
  writeFixedTaskCreateForm,
} from "../../utils/fixedTaskScreenDraft";

const { showError, showSuccess } = vi.hoisted(() => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError, showSuccess }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "m1", role: "branch_manager", branch_id: "b1", full_name: "דנה" },
  }),
}));

vi.mock("../../services/fixedTaskService", () => ({
  fixedTaskService: { list: vi.fn() },
}));

vi.mock("../../services/taskService", () => ({
  taskService: { createTemplate: vi.fn() },
}));

vi.mock("../../services/userService", () => ({
  userService: { listTeam: vi.fn() },
}));

vi.mock("../../services/branchService", () => ({
  branchService: { list: vi.fn() },
}));

vi.mock("../../components/tasks/NewTaskFormDialog", () => ({
  default: (props: { rememberKey?: string }) =>
    props.rememberKey ? <div data-testid="fixed-task-create-restored" /> : null,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/manager/fixed-tasks"]}>
      <Routes>
        <Route path="/manager/fixed-tasks" element={<ManagerFixedTasksPage />} />
        <Route path="/manager/fixed-tasks/:key" element={<div data-testid="detail-route" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManagerFixedTasksPage", () => {
  beforeEach(() => {
    clearFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY);
    vi.mocked(userService.listTeam).mockResolvedValue([]);
  });

  it("shows the header and empty state", async () => {
    vi.mocked(fixedTaskService.list).mockResolvedValue([]);
    renderPage();
    expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(he.managerFixedTasksEmpty)).toBeTruthy());
  });

  it("renders one card per task and opens its detail page", async () => {
    vi.mocked(fixedTaskService.list).mockResolvedValue([
      fixtureGroup({ key: "g1", title: "פתיחת סניף" }),
      fixtureGroup({ key: "g2", title: "סגירת סניף", is_network: false, branches: [fixtureBranch()] }),
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText("פתיחת סניף")).toBeTruthy());
    expect(screen.getByText("סגירת סניף")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `${he.edit}: פתיחת סניף` }));
    expect(screen.getByTestId("detail-route")).toBeTruthy();
  });

  it("filters by activity and by title search", async () => {
    vi.mocked(fixedTaskService.list).mockResolvedValue([
      fixtureGroup({ key: "g1", title: "ניקיון" }),
      fixtureGroup({ key: "g2", title: "מלאי", active_count: 0 }),
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText("ניקיון")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: he.managerFixedTasksFilterInactive }));
    expect(screen.queryByText("ניקיון")).toBeNull();
    expect(screen.getByText("מלאי")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.managerFixedTasksFilterAll }));
    fireEvent.change(screen.getByLabelText(he.fixedGroupSearch), { target: { value: "ניק" } });
    expect(screen.queryByText("מלאי")).toBeNull();
    expect(screen.getByText("ניקיון")).toBeTruthy();
  });

  it("stays visible when the API returns a null title and a non-array team", async () => {
    vi.mocked(fixedTaskService.list).mockResolvedValue([
      fixtureGroup({ title: null as unknown as string, weekly_days: ["0", "1"] as unknown as string }),
    ]);
    vi.mocked(userService.listTeam).mockResolvedValue(undefined as never);
    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy());
    expect(screen.queryByText(he.pageCrashTitle)).toBeNull();
  });

  it("reopens the create form after leaving the screen", async () => {
    const file = new File(["img"], "example.jpg", { type: "image/jpeg" });
    writeFixedTaskCreateForm(MANAGER_FIXED_TASKS_DRAFT_KEY, {
      taskKind: "fixed",
      branchId: "b1",
      title: "ששש",
      description: "",
      assigneeUserId: "u1",
      dueAt: "",
      recurrence: "weekly",
      dueTime: "09:00",
      weeklyDays: "2",
      monthlyDay: 1,
      opsCategory: "",
      selectedBranchIds: ["b1"],
      completionRequirements: [{ kind: "photo", title: "מדף", example_url: "blob:ex", pending_example: file }],
      isWorkStart: false,
      isWorkEnd: false,
      startUrl: "",
      media: { reference_photo_url: "", reference_video_url: "", reference_audio_url: "" },
    });
    vi.mocked(fixedTaskService.list).mockResolvedValue([]);
    renderPage();
    expect(screen.getByTestId("fixed-task-create-restored")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy());
  });

  it("shows an error instead of a blank page when loading fails", async () => {
    vi.mocked(fixedTaskService.list).mockRejectedValue(new ApiError("שגיאת שרת", 500));
    renderPage();
    await waitFor(() => expect(screen.getByText("שגיאת שרת")).toBeTruthy());
    expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy();
  });
});
