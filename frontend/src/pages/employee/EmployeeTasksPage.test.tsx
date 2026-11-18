import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EmployeeTasksPage from "./EmployeeTasksPage";
import { he } from "../../i18n/he";
import { dashboardService, type EmployeeDashboard, type EmployeeTaskCard } from "../../services/dashboardService";
import { getEmployeeTodayScreen, setEmployeeTodayScreen } from "../../utils/employeeTodayScreenStore";
import { within } from "@testing-library/react";

/** Suite complète en parallèle : laisser au premier rendu le temps d'arriver. */
const WAIT = { timeout: 5000 };

/** Échéance du jour à l'heure locale (indépendant du fuseau de la machine de test). */
function todayAt(hour: number, minute = 0): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).toISOString();
}

/** File d'envoi du téléphone : tâches finies sans קליטה dont les vidéos attendent. */
const pendingUploadIds = vi.hoisted(() => ({ current: new Set<string>() }));
vi.mock("../../hooks/usePendingUploads", () => ({
  usePendingUploads: () => ({ taskIds: pendingUploadIds.current, taskCount: pendingUploadIds.current.size }),
}));

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

const mockAuth = vi.hoisted(() => ({ role: "employee" }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "e1", role: mockAuth.role, preferred_language: "he", full_name: "דני עובד" },
    refresh: vi.fn(),
  }),
}));

vi.mock("../../services/dashboardService", () => ({
  dashboardService: { getEmployee: vi.fn() },
}));

vi.mock("../../services/employeeActivityService", () => ({
  employeeActivityService: { getBreak: vi.fn().mockResolvedValue({ on_break: false }) },
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: { inbox: vi.fn().mockResolvedValue({ items: [], up: null, unread_count: 0, managers: [] }) },
}));

vi.mock("../../hooks/useTaskChangeListener", () => ({
  useTaskChangeListener: () => undefined,
}));

vi.mock("../../hooks/useBranchWeather", () => ({
  useBranchWeather: () => null,
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

vi.mock("../../components/tasks/EmployeeTaskDetailDialog", () => ({
  default: ({
    task,
    onChatUpdated,
    chatFirst,
  }: {
    task: { title?: string } | null;
    onChatUpdated?: () => void;
    chatFirst?: boolean;
  }) =>
    task ? (
      <div>
        <div>detail:{task.title}</div>
        {chatFirst ? <div>chat-first</div> : null}
        <button type="button" onClick={() => onChatUpdated?.()}>send-chat</button>
      </div>
    ) : null,
}));

function card(over: Partial<EmployeeTaskCard> & Pick<EmployeeTaskCard, "id" | "title">): EmployeeTaskCard {
  return {
    description: "",
    due_at: over.due_at ?? "2099-09-02T20:00:00+03:00",
    status: over.status ?? "pending",
    task_kind: over.task_kind ?? "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    ...over,
  };
}

function dashboard(over: Partial<EmployeeDashboard> = {}): EmployeeDashboard {
  return {
    due_on: "2026-09-02",
    employee: {
      id: "e1",
      full_name: "דני עובד",
      job_function: null,
      branch_id: "b1",
      branch_name: "שפע",
    },
    progress_percent: 0,
    on_shift: false,
    counts: {
      tasks_total: 1,
      tasks_completed: 0,
      tasks_pending: 1,
      tasks_in_progress: 0,
      tasks_overdue: 0,
      tasks_cancelled: 0,
      completion_rate: 0,
    },
    urgent_tasks: [],
    in_progress_tasks: [],
    awaiting_response_tasks: [],
    pending_review_tasks: [],
    today_tasks: [],
    completed_tasks: [],
    manager_waiting_tasks: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EmployeeTasksPage />
    </MemoryRouter>,
  );
}

describe("EmployeeTasksPage · FLOW 2 écran 01 (intégration dashboard → écran)", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getEmployee).mockReset();
    setEmployeeTodayScreen(false);
  });

  it("shows the server duration under the title, and nothing when it is null", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "a", title: "בדיקת מלאי", due_at: todayAt(7, 30), duration_minutes: 15 }),
          card({ id: "b", title: "סידור מדפים", due_at: todayAt(8), duration_minutes: null }),
        ],
      }),
    );
    renderPage();
    const withDuration = (await screen.findByText("בדיקת מלאי", {}, WAIT)).closest("[data-testid='today-task-item']") as HTMLElement;
    expect(within(withDuration).getByText(he.todayTaskMinutes(15))).toBeTruthy();
    expect(within(withDuration).getByText("07:30")).toBeTruthy();
    const without = screen.getByText("סידור מדפים").closest("[data-testid='today-task-item']") as HTMLElement;
    expect(without.textContent).not.toContain("דק׳");
  });

  it("groups the dashboard tasks by moment of the day, done and open together", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "m", title: "משימת בוקר", due_at: todayAt(9) }),
          card({ id: "e", title: "משימת ערב", due_at: todayAt(19) }),
        ],
        completed_tasks: [card({ id: "n", title: "משימת צהריים", due_at: todayAt(13), status: "completed" })],
      }),
    );
    renderPage();
    await screen.findByText("משימת בוקר", {}, WAIT);
    expect(within(screen.getByTestId("today-period-tasks-morning")).getByText("משימת בוקר")).toBeTruthy();
    expect(within(screen.getByTestId("today-period-tasks-noon")).getByText("משימת צהריים")).toBeTruthy();
    expect(within(screen.getByTestId("today-period-tasks-evening")).getByText("משימת ערב")).toBeTruthy();
    const order = Array.from(screen.getByTestId("today-periods").querySelectorAll("section")).map((s) => s.getAttribute("data-testid"));
    expect(order).toEqual(["today-period-morning", "today-period-noon", "today-period-evening"]);
  });

  it("tells the Layout to hide its chrome while the screen is shown", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({ on_shift: true, today_tasks: [card({ id: "t", title: "מדף חלב" })] }),
    );
    const { unmount } = renderPage();
    await screen.findByText("מדף חלב", {}, WAIT);
    await waitFor(() => expect(getEmployeeTodayScreen()).toBe(true), WAIT);
    unmount();
    expect(getEmployeeTodayScreen()).toBe(false);
  });

  it("does not claim the screen while the start door is open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({ today_tasks: [card({ id: "s", title: "פתיחת משמרת", is_work_start: true })] }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door", {}, WAIT)).toBeTruthy();
    // Le signal est remis à false par un effet : il peut arriver juste après l'affichage de la porte.
    await waitFor(() => expect(getEmployeeTodayScreen()).toBe(false), WAIT);
    expect(screen.queryByTestId("today-tasks-screen")).toBeNull();
  });

  it("start-door day: during the first load nothing of the today screen is shown, then the door", async () => {
    let resolve: (value: EmployeeDashboard) => void = () => undefined;
    vi.mocked(dashboardService.getEmployee).mockReturnValue(
      new Promise<EmployeeDashboard>((r) => {
        resolve = r;
      }),
    );
    renderPage();
    expect(await screen.findByTestId("today-tasks-loading", {}, WAIT)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: he.todayTasksTitle })).toBeNull();
    expect(screen.queryByTestId("flow-bottom-nav")).toBeNull();
    resolve(dashboard({ today_tasks: [card({ id: "s", title: "פתיחת משמרת", is_work_start: true })] }));
    expect(await screen.findByTestId("start-door", {}, WAIT)).toBeTruthy();
    expect(screen.queryByTestId("today-tasks-loading")).toBeNull();
    expect(screen.queryByRole("heading", { name: he.todayTasksTitle })).toBeNull();
    await waitFor(() => expect(getEmployeeTodayScreen()).toBe(false), WAIT);
  });

  it("normal day: the Layout chrome stays hidden from the first load to the loaded screen", async () => {
    let resolve: (value: EmployeeDashboard) => void = () => undefined;
    vi.mocked(dashboardService.getEmployee).mockReturnValue(
      new Promise<EmployeeDashboard>((r) => {
        resolve = r;
      }),
    );
    renderPage();
    await screen.findByTestId("today-tasks-loading", {}, WAIT);
    await waitFor(() => expect(getEmployeeTodayScreen()).toBe(true), WAIT);
    resolve(dashboard({ on_shift: true, today_tasks: [card({ id: "t", title: "מדף חלב" })] }));
    expect(await screen.findByText("מדף חלב", {}, WAIT)).toBeTruthy();
    expect(getEmployeeTodayScreen()).toBe(true);
    expect(screen.getByTestId("flow-bottom-nav")).toBeTruthy();
  });

  it.each([
    ["branch_manager", true],
    ["employee", false],
  ])("בית tab for %s: back to /manager = %s", async (role, goesToManager) => {
    mockAuth.role = role;
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({ on_shift: true, today_tasks: [card({ id: "t", title: "מדף חלב" })] }),
    );
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    try {
      render(
        <MemoryRouter initialEntries={["/employee"]}>
          <Routes>
            <Route path="/employee" element={<EmployeeTasksPage />} />
            <Route path="/manager" element={<div>manager-home</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await screen.findByText("מדף חלב", {}, WAIT);
      fireEvent.click(screen.getByTestId("flow-nav-home"));
      if (goesToManager) {
        expect(await screen.findByText("manager-home", {}, WAIT)).toBeTruthy();
        expect(scrollTo).not.toHaveBeenCalled();
      } else {
        expect(screen.queryByText("manager-home")).toBeNull();
        expect(scrollTo).toHaveBeenCalledTimes(1);
      }
    } finally {
      mockAuth.role = "employee";
      vi.unstubAllGlobals();
    }
  });

  it("opens the task flow from a row", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({ on_shift: true, today_tasks: [card({ id: "t", title: "מדף חלב", duration_minutes: 10 })] }),
    );
    renderPage();
    fireEvent.click(await screen.findByText("מדף חלב", {}, WAIT));
    expect(screen.getByText("detail:מדף חלב")).toBeTruthy();
  });
});

describe("EmployeeTasksPage punch doors", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getEmployee).mockReset();
  });

  it("shows only the start door while clock-in is open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        counts: {
          tasks_total: 4,
          tasks_completed: 0,
          tasks_pending: 4,
          tasks_in_progress: 0,
          tasks_overdue: 0,
          tasks_cancelled: 0,
          completion_rate: 0,
        },
        employee: {
          id: "e1",
          full_name: "דני עובד",
          job_function: null,
          branch_id: "b1",
          branch_name: "שפע",
          quality_rating: { average: 4, count: 2, by_category: [] },
        },
        today_tasks: [
          card({ id: "s", title: "פתיחת משמרת", is_work_start: true }),
          card({ id: "t", title: "מדף חלב" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door")).toBeTruthy();
    expect(screen.queryByTestId("employee-home-header")).toBeNull();
    expect(screen.queryByTestId("employee-timeline")).toBeNull();
    expect(screen.getAllByText(/שפע/)).toHaveLength(1);
    expect(screen.queryByText("מדף חלב")).toBeNull();
    expect(screen.queryByRole("button", { name: he.employeeBreakStart })).toBeNull();
    expect(screen.queryByText(he.employeeProgressDoneLabel, { exact: false })).toBeNull();
    expect(screen.queryByText(he.qualityRatingCount(2))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.punchOpenShift }));
    expect(screen.getByText("detail:פתיחת משמרת")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "send-chat" }));
    await waitFor(() => expect(screen.getByText("detail:פתיחת משמרת")).toBeTruthy());
  });

  it("shows the FLOW 2 today screen and lets the oved open the end door early", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "t", title: "מדף חלב" }),
          card({ id: "e", title: "סיום משמרת", is_work_end: true, due_at: "2099-09-02T20:00:00+03:00" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("מדף חלב")).toBeTruthy();
    expect(screen.getByTestId("today-tasks-screen")).toBeTruthy();
    expect(screen.getByRole("heading", { name: he.todayTasksTitle })).toBeTruthy();
    expect(screen.queryByTestId("employee-home-header")).toBeNull();
    expect(screen.queryByText("סיום משמרת", { selector: "[data-testid='today-task-title']" })).toBeNull();
    expect(screen.queryByText(he.punchClockOut)).toBeNull();
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.punchEndShift }));
    expect(screen.getByText("detail:סיום משמרת")).toBeTruthy();
    expect(screen.getByText("מדף חלב")).toBeTruthy();
  });

  it("keeps the other tasks when exit time has passed", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        counts: {
          tasks_total: 4,
          tasks_completed: 0,
          tasks_pending: 4,
          tasks_in_progress: 0,
          tasks_overdue: 0,
          tasks_cancelled: 0,
          completion_rate: 0,
        },
        today_tasks: [
          card({ id: "e", title: "סיום משמרת", is_work_end: true, due_at: "2020-01-01T17:00:00+03:00" }),
          card({ id: "t", title: "מדף חלב" }),
          card({ id: "u", title: "סידור ירקות" }),
          card({ id: "v", title: "ניקיון קופה" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("מדף חלב")).toBeTruthy();
    expect(screen.getByText("סידור ירקות")).toBeTruthy();
    expect(screen.getByText("ניקיון קופה")).toBeTruthy();
    expect(screen.getByRole("button", { name: he.punchEndShift })).toBeTruthy();
    expect(screen.queryByText(he.punchClockOut)).toBeNull();
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
  });

  it("opens the end door when due and no other work remains", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "e", title: "סיום משמרת", is_work_end: true, due_at: "2020-01-01T17:00:00+03:00" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText(he.punchClockOut)).toBeTruthy();
  });

  it("shows a task waiting for menahel approval as done in its period", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        progress_percent: 0,
        counts: {
          tasks_total: 4,
          tasks_completed: 0,
          tasks_pending: 3,
          tasks_in_progress: 0,
          tasks_overdue: 0,
          tasks_cancelled: 0,
          completion_rate: 0,
        },
        today_tasks: [
          card({ id: "a", title: "מדף חלב" }),
          card({ id: "b", title: "סידור ירקות" }),
          card({ id: "c", title: "ניקיון קופה" }),
        ],
        pending_review_tasks: [card({ id: "p", title: "מילוי מדף", status: "pending_review" })],
      }),
    );
    renderPage();
    const row = (await screen.findByText("מילוי מדף")).closest("[data-testid='today-task-item']");
    expect(row?.getAttribute("data-state")).toBe("done");
    expect(screen.getByText("מדף חלב").closest("[data-testid='today-task-item']")?.getAttribute("data-state")).toBe("pending");
  });

  it("lists completed tasks as done rows the oved can open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [card({ id: "t", title: "מדף חלב" })],
        completed_tasks: [card({ id: "c", title: "ניקוי רצפה", status: "completed" })],
      }),
    );
    renderPage();
    const done = await screen.findByText("ניקוי רצפה");
    expect(done.closest("[data-testid='today-task-item']")?.getAttribute("data-state")).toBe("done");
    fireEvent.click(done);
    expect(screen.getByText("detail:ניקוי רצפה")).toBeTruthy();
  });

  it("hides pending-review tasks while the start door is open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        today_tasks: [card({ id: "s", title: "פתיחת משמרת", is_work_start: true })],
        pending_review_tasks: [card({ id: "p", title: "מילוי מדף", status: "pending_review" })],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door")).toBeTruthy();
    expect(screen.queryByText(`${he.employeeShowCompleted} (1)`)).toBeNull();
    expect(screen.queryByText("מילוי מדף")).toBeNull();
  });

  it("shows only the start door: no other task, no finished list", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        today_tasks: [
          card({ id: "s", title: "פתיחת משמרת", is_work_start: true }),
          card({ id: "t", title: "מדף חלב" }),
        ],
        completed_tasks: [card({ id: "c", title: "ניקוי רצפה", status: "completed" })],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door")).toBeTruthy();
    expect(screen.queryByText("מדף חלב")).toBeNull();
    expect(screen.queryByText(`${he.employeeShowCompleted} (1)`)).toBeNull();
    expect(screen.queryByText("ניקוי רצפה")).toBeNull();
  });

  it("shows a submitted clock-in as a done row, not as a door", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        pending_review_tasks: [
          card({ id: "s", title: "פתיחת משמרת", status: "pending_review", is_work_start: true }),
        ],
        completed_tasks: [card({ id: "c", title: "ניקוי רצפה", status: "completed" })],
      }),
    );
    renderPage();
    const clockIn = await screen.findByText("פתיחת משמרת");
    expect(screen.queryByTestId("start-door")).toBeNull();
    expect(clockIn.closest("[data-testid='today-task-item']")?.getAttribute("data-state")).toBe("done");
    expect(screen.getByText("ניקוי רצפה")).toBeTruthy();
    fireEvent.click(clockIn);
    expect(screen.getByText("detail:פתיחת משמרת")).toBeTruthy();
  });

  it("keeps a manager-waiting task visible and opens its chat from the ⋮ menu", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [card({ id: "t", title: "ניקוי מדף", status: "in_progress" })],
        manager_waiting_tasks: [
          card({
            id: "t",
            title: "ניקוי מדף",
            status: "in_progress",
            manager_message_preview: "תסתכל בתמונה",
          }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("ניקוי מדף")).toBeTruthy();
    expect(screen.getAllByTestId("today-task-item")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("today-task-more"));
    fireEvent.click(await screen.findByTestId("today-task-menu-chat"));
    expect(screen.getByText("chat-first")).toBeTruthy();
  });

  it("hides manager waiting while the clock-in door is open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        today_tasks: [
          card({ id: "s", title: "פתיחת משמרת", is_work_start: true }),
          card({ id: "t", title: "ניקוי מדף" }),
        ],
        manager_waiting_tasks: [
          card({
            id: "t",
            title: "ניקוי מדף",
            manager_message_preview: "תסתכל בתמונה",
          }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door")).toBeTruthy();
    expect(screen.queryByText(`${he.employeeManagerWaiting} (1)`)).toBeNull();
    expect(screen.queryByText("ניקוי מדף")).toBeNull();
  });
});

describe("EmployeeTasksPage · ouverture de משמרת envoyée sans קליטה", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getEmployee).mockReset();
    pendingUploadIds.current = new Set();
  });

  it("goes to the today screen instead of the start door, the opening checked « ממתין לקליטה »", async () => {
    pendingUploadIds.current = new Set(["s"]);
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        // Le serveur n'a pas encore les vidéos : la tâche est toujours en cours chez lui.
        in_progress_tasks: [card({ id: "s", title: "פתיחת משמרת", is_work_start: true, status: "in_progress", due_at: todayAt(8) })],
        today_tasks: [card({ id: "t", title: "מדף חלב", due_at: todayAt(9) })],
      }),
    );
    renderPage();
    await screen.findByText("מדף חלב", {}, WAIT);
    expect(screen.queryByTestId("start-door")).toBeNull();
    const opening = screen.getByText("פתיחת משמרת").closest("[data-testid='today-task-item']");
    expect(opening?.getAttribute("data-state")).toBe("awaiting-upload");
    expect(within(opening as HTMLElement).getByText(he.todayAwaitingUpload)).toBeTruthy();
  });

  it("still shows the start door when nothing waits on the phone (videos lost: film again)", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        in_progress_tasks: [card({ id: "s", title: "פתיחת משמרת", is_work_start: true, status: "in_progress" })],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("start-door", {}, WAIT)).toBeTruthy();
  });
});
