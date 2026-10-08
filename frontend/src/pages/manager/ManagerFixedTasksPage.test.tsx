import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ManagerFixedTasksPage from "./ManagerFixedTasksPage";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";
import { userService } from "../../services/userService";
import { ApiError } from "../../services/api";
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

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    account: vi.fn(async () => ({ configured: false, username: "", internal: false })),
    saveAccount: vi.fn(),
    syncToday: vi.fn(),
    inbox: vi.fn(async () => []),
    markTemplate: vi.fn(),
    linkCustomer: vi.fn(),
  },
}));

vi.mock("../../services/taskService", () => ({
  taskService: {
    listTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  },
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

vi.mock("../../components/tasks/TaskReferenceMediaEditor", () => ({
  default: () => null,
  resolveTaskReferenceMedia: async () => ({}),
}));

vi.mock("../../components/tasks/CompletionRequirementsEditor", () => ({
  default: () => null,
}));

describe("ManagerFixedTasksPage", () => {
  beforeEach(() => {
    clearFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY);
    vi.mocked(userService.listTeam).mockResolvedValue([]);
  });

  it("shows the header and empty state", async () => {
    vi.mocked(taskService.listTemplates).mockResolvedValue([]);
    render(<ManagerFixedTasksPage />);
    expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(he.managerFixedTasksEmpty)).toBeTruthy());
  });

  it("renders a template row", async () => {
    vi.mocked(taskService.listTemplates).mockResolvedValue([
      {
        id: "t1",
        branch_id: "b1",
        title: "פתיחת סניף",
        description: "",
        recurrence: "daily",
        due_time: "09:00",
        weekly_days: null,
        monthly_day: null,
        assignee_user_id: "u1",
        department_id: null,
        task_kind: "fixed",
        photo_required: true,
        is_active: true,
        created_by_id: "m1",
        created_at: "",
        updated_at: "",
        assignee_name: "עובד",
      },
    ]);
    render(<ManagerFixedTasksPage />);
    await waitFor(() => expect(screen.getByText("פתיחת סניף")).toBeTruthy());
  });

  it("stays visible when the API returns a non-array or a null title", async () => {
    vi.mocked(taskService.listTemplates).mockResolvedValue([
      {
        id: "t1",
        branch_id: "b1",
        title: null as unknown as string,
        description: "",
        recurrence: "daily",
        due_time: "09:00",
        weekly_days: ["0", "1"] as unknown as string,
        monthly_day: null,
        assignee_user_id: null,
        department_id: null,
        task_kind: "fixed",
        photo_required: false,
        is_active: true,
        created_by_id: "m1",
        created_at: "",
        updated_at: "",
        assignee_name: { he: "עובד" } as unknown as string,
      },
    ]);
    vi.mocked(userService.listTeam).mockResolvedValue(undefined as never);
    render(<ManagerFixedTasksPage />);
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
      completionRequirements: [
        { kind: "photo", title: "מדף", example_url: "blob:ex", pending_example: file },
      ],
      isWorkStart: false,
      isWorkEnd: false,
      startUrl: "",
      media: { reference_photo_url: "", reference_video_url: "", reference_audio_url: "" },
    });
    vi.mocked(taskService.listTemplates).mockResolvedValue([]);
    render(<ManagerFixedTasksPage />);
    expect(screen.getByTestId("fixed-task-create-restored")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy());
  });

  it("shows an error instead of a blank page when loading fails", async () => {
    vi.mocked(taskService.listTemplates).mockRejectedValue(new ApiError("שגיאת שרת", 500));
    render(<ManagerFixedTasksPage />);
    await waitFor(() => expect(screen.getByText("שגיאת שרת")).toBeTruthy());
    expect(screen.getByRole("heading", { name: he.managerFixedTasks })).toBeTruthy();
  });
});
