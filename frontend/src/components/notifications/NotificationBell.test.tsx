import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotificationBell from "./NotificationBell";
import { he } from "../../i18n/he";
import { notificationService } from "../../services/notificationService";

const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => navigate };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "emp-1", role: "employee" } }),
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
});
