import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskCreationModeDialog from "./TaskCreationModeDialog";
import { he } from "../../i18n/he";

describe("TaskCreationModeDialog", () => {
  it("offers gallery as a third creation mode", () => {
    const onSelect = vi.fn();
    render(
      <TaskCreationModeDialog open title="משימה" onClose={vi.fn()} onSelect={onSelect} />,
    );
    expect(screen.getByText(he.taskCreationModeManual)).toBeTruthy();
    expect(screen.getByText(he.taskCreationModeVoice)).toBeTruthy();
    expect(screen.getByText(he.taskCreationModeGallery)).toBeTruthy();
    fireEvent.click(screen.getByText(he.taskCreationModeGallery));
    expect(onSelect).toHaveBeenCalledWith("gallery");
  });
});
