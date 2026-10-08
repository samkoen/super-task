import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeTaskRow from "./EmployeeTaskRow";
import { he } from "../../i18n/he";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";
import type { EmployeeTaskCard } from "../../services/dashboardService";

vi.mock("../../utils/taskCardBackground", () => ({
  taskCardBackgroundUrl: vi.fn(() => null),
}));

function card(over: Partial<EmployeeTaskCard> = {}): EmployeeTaskCard {
  return {
    id: "t1",
    title: "ניקיון מדף",
    description: "פירוט ארוך שלא צריך להופיע בשורה",
    due_at: "2026-08-19T14:30:00+03:00",
    status: "pending",
    task_kind: "fixed",
    photo_required: true,
    department_name: null,
    started_at: null,
    reference_photo_url: "/uploads/ref.jpg",
    ...over,
  };
}

describe("EmployeeTaskRow", () => {
  it("shows a compact tile with name and status, opens on click", () => {
    const onOpen = vi.fn();
    render(<EmployeeTaskRow task={card()} onOpen={onOpen} />);
    expect(screen.getByText("ניקיון מדף")).toBeTruthy();
    expect(screen.getByText(he.taskStatusLabels.pending)).toBeTruthy();
    expect(screen.queryByText("פירוט ארוך שלא צריך להופיע בשורה")).toBeNull();
    expect(screen.queryByText(he.taskChatSection)).toBeNull();
    fireEvent.click(screen.getByLabelText(`${he.openTask}: ניקיון מדף`));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("נ"));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("highlights overdue exceptions", () => {
    render(<EmployeeTaskRow task={card({ status: "overdue" })} onOpen={vi.fn()} />);
    expect(screen.getByText(he.alertOverdue)).toBeTruthy();
  });

  it("shows the reference photo on the ad-hoc tile", async () => {
    vi.mocked(taskCardBackgroundUrl).mockReturnValue("https://cdn.example/p.jpg");
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const onOpen = vi.fn();
    const { container } = render(
      <EmployeeTaskRow task={card({ task_kind: "ad_hoc" })} onOpen={onOpen} />,
    );
    const enlarge = await screen.findByLabelText(he.taskPhotoEnlarge);
    fireEvent.click(container.querySelector("img")!);
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(enlarge);
    expect(onOpen).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("hides the photo on the fixed-task list row", () => {
    vi.mocked(taskCardBackgroundUrl).mockReturnValue("https://cdn.example/p.jpg");
    render(<EmployeeTaskRow task={card()} onOpen={vi.fn()} layout="list" />);
    expect(screen.queryByLabelText(he.taskPhotoEnlarge)).toBeNull();
    expect(screen.getByText("ניקיון מדף")).toBeTruthy();
  });

  it("shows a task awaiting manager approval exactly like a completed one", () => {
    render(
      <EmployeeTaskRow
        task={card({ status: "pending_review" })}
        onOpen={vi.fn()}
        layout="list"
      />,
    );
    expect(screen.queryByText(he.taskStatusLabels.pending_review)).toBeNull();
    const chip = screen.getByText(he.taskStatusLabels.completed);
    expect(chip.closest(".MuiChip-colorSuccess")).toBeTruthy();
  });
});
