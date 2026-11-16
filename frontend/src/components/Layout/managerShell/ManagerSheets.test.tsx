import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerCreateSheet from "./ManagerCreateSheet";
import ManagerMoreSheet from "./ManagerMoreSheet";
import ManagerTasksViewSwitch from "./ManagerTasksViewSwitch";
import { he } from "../../../i18n/he";

vi.mock("../ViewAsEmployeeDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="view-as-dialog" /> : null),
}));

describe("ManagerCreateSheet", () => {
  it("offers the three ways to create and reports the choice", () => {
    const onChoose = vi.fn();
    render(<ManagerCreateSheet open onClose={vi.fn()} onChoose={onChoose} />);
    expect(screen.getByText(he.managerCreateTitle)).toBeTruthy();
    expect(screen.getByText(he.managerCreateLabels.adHoc)).toBeTruthy();
    expect(screen.getByText(he.managerCreateLabels.fixed)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manager-create-library"));
    expect(onChoose).toHaveBeenCalledWith("library");
  });

  it("renders nothing while closed", () => {
    render(<ManagerCreateSheet open={false} onClose={vi.fn()} onChoose={vi.fn()} />);
    expect(screen.queryByTestId("manager-create-sheet")).toBeNull();
  });
});

describe("ManagerMoreSheet", () => {
  it("opens view-as from a sheet row styled like the others", () => {
    const onClose = vi.fn();
    render(<ManagerMoreSheet open title="שמואל" items={[]} onClose={onClose} onSelect={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.queryByTestId("view-as-dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("manager-more-view-as"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("view-as-dialog")).toBeTruthy();
  });

  it("lists only the given items, then view-as and logout", () => {
    const onSelect = vi.fn();
    const onLogout = vi.fn();
    render(
      <ManagerMoreSheet open title="שמואל כהן" items={["reports", "settings"]} onClose={vi.fn()} onSelect={onSelect} onLogout={onLogout} />,
    );
    expect(screen.getByText(he.managerMoreLabels.reports)).toBeTruthy();
    expect(screen.queryByText(he.managerMoreLabels.myTasks)).toBeNull();
    expect(screen.getByText(he.viewAsEmployee)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manager-more-settings"));
    fireEvent.click(screen.getByTestId("manager-more-logout"));
    expect(onSelect).toHaveBeenCalledWith("settings");
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

describe("ManagerTasksViewSwitch", () => {
  it("marks the active view and switches on tap", () => {
    const onSelect = vi.fn();
    render(<ManagerTasksViewSwitch active="fixed" onSelect={onSelect} />);
    expect(screen.getByTestId("manager-tasks-view-fixed").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("manager-tasks-view-today").getAttribute("aria-selected")).toBe("false");
    fireEvent.click(screen.getByText(he.managerTasksViewLabels.library));
    expect(onSelect).toHaveBeenCalledWith("library");
  });
});
