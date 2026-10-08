import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerQuickActions from "./ManagerQuickActions";
import { he } from "../../i18n/he";

describe("ManagerQuickActions", () => {
  it("triggers the matching callback for each shortcut", () => {
    const onNewTask = vi.fn();
    const onGalleryTask = vi.fn();
    const onViewTasks = vi.fn();
    render(
      <ManagerQuickActions
        onNewTask={onNewTask}
        onGalleryTask={onGalleryTask}
        onViewTasks={onViewTasks}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.newTask }));
    fireEvent.click(screen.getByRole("button", { name: he.newTaskFromGallery }));
    fireEvent.click(screen.getByRole("button", { name: he.dashboardViewTasks }));
    expect(onNewTask).toHaveBeenCalledTimes(1);
    expect(onGalleryTask).toHaveBeenCalledTimes(1);
    expect(onViewTasks).toHaveBeenCalledTimes(1);
  });

  it("exposes a labelled region for assistive tech", () => {
    render(<ManagerQuickActions onNewTask={vi.fn()} onGalleryTask={vi.fn()} onViewTasks={vi.fn()} />);
    expect(screen.getByRole("region", { name: he.managerQuickActionsLabel })).toBeTruthy();
  });
});
