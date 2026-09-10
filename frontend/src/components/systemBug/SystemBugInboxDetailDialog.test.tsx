import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SystemBugInboxDetailDialog from "./SystemBugInboxDetailDialog";
import { getSystemBug, patchSystemBug, type SystemBugInboxItem } from "../../services/systemBugService";
import { he } from "../../i18n/he";

vi.mock("../../services/systemBugService", () => ({
  getSystemBug: vi.fn(),
  patchSystemBug: vi.fn(),
}));

function report(over: Partial<SystemBugInboxItem> = {}): SystemBugInboxItem {
  return {
    id: "bug-1",
    reporter_user_id: "u1",
    reporter_name: "דני",
    reporter_role: "employee",
    branch_name: "שפע",
    network_name: "ירקות",
    note: "נפל המסך",
    route: "/employee",
    trail: [],
    app_version: "1.0",
    screenshot_url: null,
    audio_url: null,
    github_issue_url: null,
    status: "open",
    comments: [],
    created_at: "2026-09-10T10:00:00+03:00",
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(getSystemBug).mockReset();
  vi.mocked(patchSystemBug).mockReset();
});

describe("SystemBugInboxDetailDialog", () => {
  it("lets the owner add a comment after opening", async () => {
    vi.mocked(getSystemBug).mockResolvedValue(report());
    vi.mocked(patchSystemBug).mockResolvedValue(
      report({ comments: [{ author_name: "יצחק", body: "נבדק", created_at: "t" }] }),
    );
    const onUpdated = vi.fn();
    render(
      <SystemBugInboxDetailDialog reportId="bug-1" onClose={vi.fn()} onUpdated={onUpdated} />,
    );
    await screen.findByText("נפל המסך");
    fireEvent.change(screen.getByLabelText(he.systemBugInboxComment), { target: { value: "נבדק" } });
    fireEvent.click(screen.getByRole("button", { name: he.systemBugInboxAddComment }));
    await waitFor(() => {
      expect(patchSystemBug).toHaveBeenCalledWith("bug-1", { comment: "נבדק" });
      expect(onUpdated).toHaveBeenCalled();
    });
    expect(await screen.findByText("נבדק")).toBeTruthy();
  });

  it("closes with the written explanation", async () => {
    vi.mocked(getSystemBug).mockResolvedValue(report());
    vi.mocked(patchSystemBug).mockResolvedValue(
      report({ status: "closed", comments: [{ author_name: "יצחק", body: "תוקן", created_at: "t" }] }),
    );
    render(<SystemBugInboxDetailDialog reportId="bug-1" onClose={vi.fn()} />);
    await screen.findByText("נפל המסך");
    fireEvent.change(screen.getByLabelText(he.systemBugInboxComment), { target: { value: "תוקן" } });
    fireEvent.click(screen.getByRole("button", { name: he.systemBugInboxClose }));
    await waitFor(() => {
      expect(patchSystemBug).toHaveBeenCalledWith("bug-1", { status: "closed", comment: "תוקן" });
    });
  });

  it("blocks close without an explanation", async () => {
    vi.mocked(getSystemBug).mockResolvedValue(report());
    render(<SystemBugInboxDetailDialog reportId="bug-1" onClose={vi.fn()} />);
    await screen.findByText("נפל המסך");
    expect((screen.getByRole("button", { name: he.systemBugInboxClose }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(patchSystemBug).not.toHaveBeenCalled();
  });
});
