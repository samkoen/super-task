import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ManagerShell from "./ManagerShell";
import { useManagerChatUnread } from "../../../hooks/useManagerChatUnread";
import { useManagerDesktop } from "../../../hooks/useManagerDesktop";
import { he } from "../../../i18n/he";
import { MANAGER_SCOPE_BRANCH_STORAGE_KEY } from "../../../utils/managerScopeBranch";

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "nm1", full_name: "יצחק ריצ'רד", role: "network_manager", branch_id: null } }),
}));
vi.mock("../../../services/branchService", () => ({
  branchService: { list: vi.fn().mockResolvedValue([{ id: "b1", name: "חיפה" }, { id: "b2", name: "אילת" }]) },
}));
vi.mock("../../../hooks/useManagerDesktop", () => ({ useManagerDesktop: vi.fn(() => false) }));
vi.mock("../../../hooks/useManagerChatUnread", () => ({ useManagerChatUnread: vi.fn(() => 2) }));
vi.mock("../../ui/PullToRefresh", () => ({ LivePullToRefresh: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("../../notifications/NotificationBell", () => ({
  default: ({ renderTrigger }: { renderTrigger: (open: () => void, unread: number) => JSX.Element }) => renderTrigger(() => undefined, 0),
}));
vi.mock("../../../hooks/useResolvedMediaSrc", () => ({ useResolvedMediaSrc: () => ({ src: null }) }));
vi.mock("../ViewAsEmployeeDialog", () => ({ default: () => null }));

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

function renderShell(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<ManagerShell overlays={null} muteIncoming={false} onLogout={vi.fn()}><Where /></ManagerShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId("where").textContent;

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(useManagerDesktop).mockReturnValue(false);
});

describe("ManagerShell — périmètre reshet", () => {
  it("picks a branch for every tab from the header, then goes back to the whole network", async () => {
    renderShell("/manager");
    expect(screen.getByTestId("manager-scope-pill").textContent).toContain(he.managerHomeNetworkTitle);
    expect(screen.queryByTestId("manager-scope-network")).toBeNull();
    fireEvent.click(screen.getByTestId("manager-scope-pill"));
    fireEvent.click(await screen.findByTestId("manager-scope-option-b1"));
    expect(where()).toBe("/manager?branch=b1");
    expect(screen.getByTestId("manager-scope-pill").textContent).toContain("חיפה");
    fireEvent.click(screen.getByTestId("manager-pill-team"));
    expect(where()).toBe("/manager/employees?branch=b1");
    fireEvent.click(screen.getByTestId("manager-scope-network"));
    expect(where()).toBe("/manager/employees");
    expect(screen.getByTestId("manager-scope-pill").textContent).toContain(he.managerHomeNetworkTitle);
  });

  it("does not bring back a snif left in the session when the address says « כל הרשת »", () => {
    sessionStorage.setItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY, "b1");
    renderShell("/manager");
    expect(screen.getByTestId("manager-scope-pill").textContent).toContain(he.managerHomeNetworkTitle);
    fireEvent.click(screen.getByTestId("manager-pill-team"));
    expect(where()).toBe("/manager/employees");
  });

  it("keeps the chosen snif in the session on a sub-page without branch=", () => {
    sessionStorage.setItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY, "b1");
    renderShell("/manager/reports");
    expect(sessionStorage.getItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY)).toBe("b1");
  });

  it("counts the שיחות dot for the chosen snif", async () => {
    renderShell("/manager");
    expect(useManagerChatUnread).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByTestId("manager-scope-pill"));
    fireEvent.click(await screen.findByTestId("manager-scope-option-b2"));
    expect(useManagerChatUnread).toHaveBeenLastCalledWith("b2");
  });

  it("reads the branch from a deep link and names it once the branches are loaded", async () => {
    renderShell("/manager/chats?branch=b2");
    await waitFor(() => expect(screen.getByTestId("manager-scope-pill").textContent).toContain("אילת"));
    expect(screen.getByTestId("manager-scope-network")).toBeTruthy();
  });

  it("keeps the scope pill off sub-pages such as the studio", () => {
    renderShell("/manager/tasks/new?branch=b1");
    expect(screen.queryByTestId("manager-scope-pill")).toBeNull();
  });
});

describe("ManagerShell — version ordinateur", () => {
  it("replaces the bottom pill with a side rail that navigates and opens « עוד »", () => {
    vi.mocked(useManagerDesktop).mockReturnValue(true);
    renderShell("/manager");
    expect(screen.queryByTestId("manager-pill-nav")).toBeNull();
    expect(screen.getByTestId("manager-rail-home").getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("manager-rail-unread")).toBeTruthy();
    fireEvent.click(screen.getByTestId("manager-rail-tasks"));
    expect(where()).toBe("/manager/tasks");
    // L'avatar vit en bas du rail : l'en-tête ne garde que la salutation.
    expect(screen.queryByTestId("manager-topbar-more")).toBeNull();
    expect(screen.getByTestId("manager-topbar-greeting")).toBeTruthy();
    fireEvent.click(screen.getByTestId("manager-rail-more"));
    expect(screen.getByTestId("manager-more-sheet")).toBeTruthy();
  });

  it("keeps the bottom pill on mobile", () => {
    renderShell("/manager");
    expect(screen.getByTestId("manager-pill-nav")).toBeTruthy();
    expect(screen.queryByTestId("manager-side-rail")).toBeNull();
  });
});
