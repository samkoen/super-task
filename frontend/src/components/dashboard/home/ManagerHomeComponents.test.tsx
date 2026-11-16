import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerInboxStack from "./ManagerInboxStack";
import ManagerNetworkHome from "./ManagerNetworkHome";
import ManagerOwnTasksLine from "./ManagerOwnTasksLine";
import ManagerPulseCard from "./ManagerPulseCard";
import ManagerTeamNow from "./ManagerTeamNow";
import { he } from "../../../i18n/he";
import type { InboxItem, ManagerPulse, TeamNowEntry } from "../../../utils/managerHome";
import type { BranchSummary, TeamMember } from "../../../services/dashboardService";

const pulse: ManagerPulse = {
  total: 7, completionPct: 68, overdue: 3, health: "orange", cleaningPct: 82, frontsPct: null,
  periods: [{ period: "morning", total: 4, done: 4 }, { period: "noon", total: 2, done: 1 }, { period: "evening", total: 1, done: 0 }],
};

describe("ManagerPulseCard", () => {
  it("shows completion, lateness, the day bar and only the KPIs that exist", () => {
    const onToggle = vi.fn();
    render(<ManagerPulseCard pulse={pulse} analysisOpen={false} onToggleAnalysis={onToggle} />);
    expect(screen.getByText(he.managerHomeDone(68))).toBeTruthy();
    expect(screen.getByText(he.managerHomeOverdue(3))).toBeTruthy();
    expect(screen.getByText(he.managerHomeKpiCleaning(82))).toBeTruthy();
    expect(screen.queryByText(/חזיתות/)).toBeNull();
    expect(screen.getByText(he.managerHomePeriods.evening)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manager-pulse"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not claim 100% on a day without tasks", () => {
    render(<ManagerPulseCard pulse={{ ...pulse, total: 0, completionPct: 100, overdue: 0 }} analysisOpen={false} onToggleAnalysis={vi.fn()} />);
    expect(screen.getByText(he.managerHomeNoTasks)).toBeTruthy();
    expect(screen.queryByText(he.managerHomeDone(100))).toBeNull();
  });

  it("says everything is on time when nothing is late", () => {
    render(<ManagerPulseCard pulse={{ ...pulse, overdue: 0 }} analysisOpen onToggleAnalysis={vi.fn()} />);
    expect(screen.getByText(he.managerHomeOnTime)).toBeTruthy();
    expect(screen.getByTestId("manager-pulse").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("ManagerInboxStack", () => {
  const items: InboxItem[] = [
    { key: "q", kind: "question", title: "סרטון מקרר ריק", who: "דני", preview: "", taskId: "t1" },
    { key: "r", kind: "review", title: "סרטון גיבוי", who: "רונית", preview: "", taskId: "t2" },
    { key: "c", kind: "chat", title: "יוסי", who: "", preview: "שלום" },
    { key: "c2", kind: "chat", title: "מאיה", who: "", preview: "" },
  ];

  it("opens the front card and shows at most two tabs under it", () => {
    const onOpen = vi.fn();
    render(<ManagerInboxStack items={items} onOpen={onOpen} />);
    expect(screen.getByText(he.managerHomeInboxTitle(4))).toBeTruthy();
    expect(screen.getByTestId("inbox-card").getAttribute("data-kind")).toBe("question");
    expect(screen.getAllByTestId("inbox-tab")).toHaveLength(2);
    fireEvent.click(screen.getByText(he.managerHomeInboxActions.question));
    expect(onOpen).toHaveBeenCalledWith(items[0]);
    fireEvent.click(screen.getAllByTestId("inbox-tab")[0]);
    expect(onOpen).toHaveBeenLastCalledWith(items[1]);
  });

  it("shows the all-clear state when nothing waits", () => {
    render(<ManagerInboxStack items={[]} onOpen={vi.fn()} />);
    expect(screen.getByText(he.managerHomeInboxEmpty)).toBeTruthy();
  });
});

describe("ManagerTeamNow", () => {
  const entry = (id: string, state: TeamNowEntry["state"], detail: string | null = null): TeamNowEntry => ({
    id, name: `עובד ${id}`, initial: "ע", state, detail, member: { user_id: id } as TeamMember,
  });

  it("shows each oved with the current task or state, and opens on tap", () => {
    const onOpen = vi.fn();
    render(<ManagerTeamNow entries={[entry("1", "idle"), entry("2", "working", "מילוי מדף")]} onOpen={onOpen} />);
    expect(screen.getByText(he.managerHomeTeamStates.idle)).toBeTruthy();
    expect(screen.getByText("מילוי מדף")).toBeTruthy();
    fireEvent.click(screen.getAllByTestId("team-now-person")[1]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
  });

  it("explains an empty team", () => {
    render(<ManagerTeamNow entries={[]} onOpen={vi.fn()} />);
    expect(screen.getByText(he.managerHomeTeamEmpty)).toBeTruthy();
  });
});

describe("ManagerOwnTasksLine", () => {
  it("summarises the manager's own tasks and opens his flow", () => {
    const onOpen = vi.fn();
    render(<ManagerOwnTasksLine summary={{ open: 3, nextAt: null, late: true }} onOpen={onOpen} />);
    expect(screen.getByText(he.managerHomeOwnTasks(3, ""))).toBeTruthy();
    expect(screen.getByTestId("manager-own-tasks").getAttribute("data-late")).toBe("true");
    fireEvent.click(screen.getByTestId("manager-own-tasks"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("ManagerNetworkHome", () => {
  const b = (id: string, health: BranchSummary["health"], overdue = 0): BranchSummary => ({ branch_id: id, name: `סניף ${id}`, health, overdue, pending: 0, completion_rate: 0.5 });

  it("shows only branches needing action, with the full list folded", () => {
    const onOpen = vi.fn();
    render(<ManagerNetworkHome overview={{ healthy: 1, attention: [b("r", "red", 4)], all: [b("r", "red", 4), b("g", "green")] }} onOpenBranch={onOpen} />);
    expect(screen.getByText(he.managerHomeNetworkStatus(1, 1))).toBeTruthy();
    expect(screen.getAllByTestId("network-branch")).toHaveLength(1);
    expect(screen.getByText(he.managerHomeOverdue(4))).toBeTruthy();
    fireEvent.click(screen.getByTestId("network-all-toggle"));
    expect(screen.getAllByTestId("network-branch")).toHaveLength(3);
    fireEvent.click(screen.getAllByTestId("network-branch")[0]);
    expect(onOpen).toHaveBeenCalledWith("r");
  });

  it("hides the folded list when every branch is already listed above", () => {
    render(<ManagerNetworkHome overview={{ healthy: 0, attention: [b("r", "red", 1), b("o", "orange", 1)], all: [b("r", "red", 1), b("o", "orange", 1)] }} onOpenBranch={vi.fn()} />);
    expect(screen.getAllByTestId("network-branch")).toHaveLength(2);
    expect(screen.queryByTestId("network-all-toggle")).toBeNull();
  });

  it("places the inbox right under the status sentence", () => {
    render(<ManagerNetworkHome overview={{ healthy: 1, attention: [], all: [b("g", "green")] }} onOpenBranch={vi.fn()} inbox={<div data-testid="slot-inbox" />} />);
    // Première colonne (ordinateur) / haut de page (mobile) : la phrase d'état, puis la pile.
    const first = screen.getByTestId("manager-column-first");
    expect(first.children[0].getAttribute("data-testid")).toBe("network-status");
    expect(first.children[1].getAttribute("data-testid")).toBe("slot-inbox");
  });

  it("puts the branches needing action and the full list in the second column", () => {
    render(<ManagerNetworkHome overview={{ healthy: 1, attention: [b("r", "red", 2)], all: [b("r", "red", 2), b("g", "green")] }} onOpenBranch={vi.fn()} />);
    const second = screen.getByTestId("manager-column-second");
    expect(second.textContent).toContain(he.managerHomeAttentionTitle);
    expect(second.querySelector("[data-testid='network-all-toggle']")).toBeTruthy();
  });

  it("searches the full list of a large network", () => {
    const all = ["א", "ב", "ג", "ד", "ה", "ו", "חיפה"].map((id) => b(id, "green"));
    render(<ManagerNetworkHome overview={{ healthy: 7, attention: [], all }} onOpenBranch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("network-all-toggle"));
    fireEvent.change(screen.getByTestId("network-all-search"), { target: { value: "חיפה" } });
    expect(screen.getAllByTestId("network-branch").map((r) => r.textContent)).toEqual([expect.stringContaining("סניף חיפה")]);
    fireEvent.change(screen.getByTestId("network-all-search"), { target: { value: "אילת" } });
    expect(screen.getByTestId("network-all-empty")).toBeTruthy();
  });

  it("offers no search for a small network", () => {
    render(<ManagerNetworkHome overview={{ healthy: 2, attention: [], all: [b("a", "green"), b("b", "green")] }} onOpenBranch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("network-all-toggle"));
    expect(screen.queryByTestId("network-all-search")).toBeNull();
  });

  it("celebrates a fully healthy network", () => {
    render(<ManagerNetworkHome overview={{ healthy: 2, attention: [], all: [b("a", "green"), b("b", "green")] }} onOpenBranch={vi.fn()} />);
    expect(screen.getByText(he.managerHomeAllHealthy)).toBeTruthy();
  });
});
