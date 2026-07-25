import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PendingTaskMediaCard from "./PendingTaskMediaCard";
import { he } from "../../i18n/he";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";
import type { TimelineTask } from "../../services/dashboardService";

vi.mock("../../utils/taskCardBackground", () => ({
  taskCardBackgroundUrl: vi.fn(() => null),
}));

function task(overrides: Partial<TimelineTask> = {}): TimelineTask {
  return {
    id: "t1",
    title: "ספירת מלאי מחסן",
    status: "overdue",
    segment: "overdue",
    due_at: "2026-07-25T07:30:00+03:00",
    started_at: null,
    completed_at: null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: "אוראל",
    assignee_name: "אוראל",
    task_kind: "fixed",
    reference_photo_url: "/uploads/task_photos/a.jpg",
    ...overrides,
  };
}

describe("PendingTaskMediaCard", () => {
  beforeEach(() => {
    vi.mocked(taskCardBackgroundUrl).mockReturnValue(null);
  });

  it("renders title and status without photo", () => {
    render(<PendingTaskMediaCard task={task()} />);
    expect(screen.getByText("ספירת מלאי מחסן")).toBeTruthy();
    expect(screen.getByText(he.timelineSegmentOverdue)).toBeTruthy();
    expect(screen.queryByLabelText(he.taskPhotoEnlarge)).toBeNull();
  });

  it("calls onOpen when info area is clicked", () => {
    const onOpen = vi.fn();
    render(<PendingTaskMediaCard task={task()} onOpen={onOpen} />);
    fireEvent.click(screen.getByLabelText(`${he.openTask}: ספירת מלאי מחסן`));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].id).toBe("t1");
  });

  it("shows zoomable photo half when reference photo loads", async () => {
    vi.mocked(taskCardBackgroundUrl).mockReturnValue("https://cdn.example/p.jpg");
    const OriginalImage = globalThis.Image;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);

    render(<PendingTaskMediaCard task={task()} />);
    const enlarge = await screen.findByLabelText(he.taskPhotoEnlarge);
    fireEvent.click(enlarge);
    await waitFor(() => {
      expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
    });

    vi.stubGlobal("Image", OriginalImage);
  });
});
