import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotificationBell from "./NotificationBell";
import { NOTIFICATION_EVENT } from "../../constants/events";
import { he } from "../../i18n/he";
import { notificationService } from "../../services/notificationService";

const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => navigate };
});

const authState = { user: { id: "emp-1", role: "employee" } };

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../../services/notificationService", () => ({
  notificationService: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock("../issues/IssueReportDetailDialog", () => ({
  default: () => null,
}));

const TASK_ALERT = {
  id: "n1",
  user_id: "emp-1",
  kind: "task_created",
  title: "משימה חדשה",
  message: "ניקיון מדף",
  occurrence_id: "occ-1",
  issue_report_id: null,
  branch_id: "b1",
  read_at: null,
  created_at: "2026-08-19T10:00:00+03:00",
};

beforeEach(() => {
  navigate.mockReset();
  authState.user = { id: "emp-1", role: "employee" };
  vi.mocked(notificationService.list).mockResolvedValue({
    items: [TASK_ALERT],
    unread_count: 1,
  });
  vi.mocked(notificationService.markRead).mockResolvedValue({
    ...TASK_ALERT,
    read_at: "2026-08-19T10:01:00+03:00",
  });
});

async function openAlerts() {
  render(<NotificationBell />);
  fireEvent.click(screen.getByLabelText(he.notificationsTitle));
  expect(await screen.findByText("משימה חדשה")).toBeTruthy();
}

describe("NotificationBell", () => {
  it("closes the alerts drawer from the X", async () => {
    await openAlerts();
    fireEvent.click(screen.getByLabelText(he.notificationsClose));
    await waitFor(() => {
      expect(screen.queryByText("משימה חדשה")).toBeNull();
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("opens the task when clicking an alert", async () => {
    await openAlerts();
    fireEvent.click(screen.getByText("משימה חדשה"));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/employee?task=occ-1");
    });
  });

  it("opens the oved task surface for a dual-hat menahel", async () => {
    authState.user = { id: "m1", role: "branch_manager" };
    await openAlerts();
    fireEvent.click(screen.getByText("משימה חדשה"));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/employee?task=occ-1");
    });
  });

  it("skips live refresh while muted except for an emergency ring", async () => {
    vi.mocked(notificationService.list).mockResolvedValue({ items: [], unread_count: 0 });
    render(<NotificationBell muteIncoming />);
    await waitFor(() => expect(notificationService.list).toHaveBeenCalled());
    vi.mocked(notificationService.list).mockClear();
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, { detail: { kind: "task_created", sound: "none" } }),
    );
    expect(notificationService.list).not.toHaveBeenCalled();
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, { detail: { kind: "break_override", sound: "task_end" } }),
    );
    await waitFor(() => expect(notificationService.list).toHaveBeenCalledTimes(1));
  });
});
