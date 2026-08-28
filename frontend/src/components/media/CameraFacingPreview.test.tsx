import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { he } from "../../i18n/he";
import CameraFacingPreview from "./CameraFacingPreview";

describe("CameraFacingPreview", () => {
  it("shows a flip control and calls onFlip", () => {
    const onFlip = vi.fn();
    render(
      <CameraFacingPreview onVideoRef={() => undefined} facing="environment" onFlip={onFlip} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureFlipCamera }));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("disables flip while the camera is switching", () => {
    render(
      <CameraFacingPreview
        onVideoRef={() => undefined}
        facing="user"
        onFlip={() => undefined}
        flipDisabled
      />,
    );
    expect(
      (screen.getByRole("button", { name: he.mediaCaptureFlipCamera }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
