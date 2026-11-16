import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ManagerShell from "./ManagerShell";
import { useManagerPageHeader } from "../../../context/ManagerPageHeaderContext";
import { he } from "../../../i18n/he";

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", full_name: "שמואל כהן", role: "branch_manager", branch_id: "b1" } }),
}));
vi.mock("../../../hooks/useEmployeeChatUnread", () => ({ useEmployeeChatUnread: () => 3 }));
vi.mock("../../ui/PullToRefresh", () => ({ LivePullToRefresh: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("../../notifications/NotificationBell", () => ({
  default: ({ renderTrigger }: { renderTrigger: (open: () => void, unread: number) => JSX.Element }) => renderTrigger(() => undefined, 0),
}));
vi.mock("../../../hooks/useResolvedMediaSrc", () => ({ useResolvedMediaSrc: () => ({ src: null }) }));
vi.mock("../ViewAsEmployeeDialog", () => ({ default: () => null }));

function Where() {
  return <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;
}

function TitledPage({ title }: { title: string }) {
  useManagerPageHeader(title, "יום שני");
  const navigate = useNavigate();
  return <button onClick={() => navigate("/manager/chats")}>לעזוב</button>;
}

function renderShell(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <ManagerShell overlays={<div data-testid="overlays" />} muteIncoming={false} onLogout={vi.fn()}>
              <Routes>
                <Route path="/manager/tasks" element={<TitledPage title="משימות" />} />
                <Route path="*" element={<Where />} />
              </Routes>
            </ManagerShell>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManagerShell", () => {
  it("shows the page title and drops it when the page goes away", () => {
    renderShell("/manager/tasks");
    expect(screen.getByRole("heading", { name: "משימות" })).toBeTruthy();
    fireEvent.click(screen.getByText("לעזוב"));
    expect(screen.queryByRole("heading", { name: "משימות" })).toBeNull();
    expect(screen.getByTestId("overlays")).toBeTruthy();
  });

  it("shows the היום / קבועות / ספרייה switch only on the tasks tab roots", () => {
    renderShell("/manager/tasks");
    expect(screen.getByTestId("manager-tasks-view-today").getAttribute("aria-selected")).toBe("true");
  });

  it("hides the switch inside the studio", () => {
    renderShell("/manager/tasks/new");
    expect(screen.queryByTestId("manager-tasks-view-today")).toBeNull();
  });

  it("opens the single studio from « + »", () => {
    renderShell("/manager");
    fireEvent.click(screen.getByLabelText(he.managerCreate));
    fireEvent.click(screen.getByTestId("manager-create-adHoc"));
    expect(screen.getByTestId("where").textContent).toBe("/manager/tasks/new");
  });

  it("opens the library picker in the studio from « + »", () => {
    renderShell("/manager");
    fireEvent.click(screen.getByLabelText(he.managerCreate));
    fireEvent.click(screen.getByTestId("manager-create-library"));
    expect(screen.getByTestId("where").textContent).toBe("/manager/tasks/new?library=1");
  });

  it("gives a branch manager no scope pill (single snif)", () => {
    renderShell("/manager");
    expect(screen.queryByTestId("manager-scope-pill")).toBeNull();
  });

  it("switches tabs from the pill", () => {
    renderShell("/manager");
    fireEvent.click(screen.getByTestId("manager-pill-team"));
    expect(screen.getByTestId("where").textContent).toBe("/manager/employees");
  });
});
