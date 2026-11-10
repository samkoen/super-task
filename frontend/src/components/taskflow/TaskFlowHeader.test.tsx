import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskFlowHeader from "./TaskFlowHeader";
import { he } from "../../i18n/he";
import { notificationService } from "../../services/notificationService";

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "e1", role: "employee" } }) }));
vi.mock("../../services/notificationService", () => ({
  notificationService: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));
vi.mock("../issues/IssueReportDetailDialog", () => ({ default: () => null }));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (src: string | null) => ({ src, failed: false, onError: vi.fn() }),
}));

function setup(unread = 0, extra: Partial<Parameters<typeof TaskFlowHeader>[0]> = {}) {
  vi.mocked(notificationService.list).mockResolvedValue({ items: [], unread_count: unread });
  const handlers = { onBack: vi.fn(), onOpenChats: vi.fn() };
  render(
    <TaskFlowHeader
      title="פתיחת משמרת"
      dueAt="2026-08-19T06:30:00"
      employeeName="אבי כהן"
      photoUrl="/avatar.jpg"
      {...handlers}
      {...extra}
    />,
  );
  return handlers;
}

describe("TaskFlowHeader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the avatar with the greeting, the task title and the due hour", () => {
    setup();
    expect(screen.getByTestId("task-flow-avatar")).toBeTruthy();
    expect(screen.getByTestId("task-flow-greeting").textContent).toContain("שלום אבי");
    expect(screen.getByTestId("task-flow-title").textContent).toBe("פתיחת משמרת");
    expect(screen.getByTestId("task-flow-due").textContent).toBe(he.flowDueAtHour("6:30"));
  });

  it("falls back to the first letter when the employee has no photo", () => {
    setup(0, { photoUrl: null });
    expect(screen.getByTestId("task-flow-avatar").textContent).toBe("א");
  });

  it("puts back on the left, then chats and bell, as round buttons", () => {
    const handlers = setup();
    const back = screen.getByTestId("task-flow-back");
    const chats = screen.getByTestId("task-flow-chats");
    const bell = screen.getByTestId("task-flow-bell");
    expect(back.compareDocumentPosition(chats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chats.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(back);
    fireEvent.click(chats);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenChats).toHaveBeenCalledTimes(1);
  });

  it("shows the orange dot on the bell only when notifications are unread", async () => {
    setup(3);
    expect(await screen.findByTestId("task-flow-bell-dot")).toBeTruthy();
  });

  it("shows no dot when everything is read", async () => {
    setup(0);
    await waitFor(() => expect(notificationService.list).toHaveBeenCalled());
    expect(screen.queryByTestId("task-flow-bell-dot")).toBeNull();
  });
});
