import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GuidedCameraStage, { type GuidedCameraStageProps } from "./GuidedCameraStage";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));

function props(overrides: Partial<GuidedCameraStageProps> = {}): GuidedCameraStageProps {
  return {
    guide: { title: "צילום כניסה", hint: "צלם סרטון קצר של המדפים", exampleSrc: "/example.jpg" },
    onVideoRef: vi.fn(),
    facing: "environment",
    recordingSeconds: null,
    shutter: { kind: "video", recording: false, disabled: false, busy: false, onPress: vi.fn() },
    onClose: vi.fn(),
    onFlip: vi.fn(),
    ...overrides,
  };
}

describe("GuidedCameraStage", () => {
  it("shows the manager's title and instruction above the viewfinder", () => {
    render(<GuidedCameraStage {...props()} />);
    expect(screen.getByRole("heading", { name: "צילום כניסה" })).toBeTruthy();
    expect(screen.getByText("צלם סרטון קצר של המדפים")).toBeTruthy();
  });

  it("keeps the manager's example visible as a thumbnail and enlarges it on tap", () => {
    render(<GuidedCameraStage {...props()} />);
    const thumb = screen.getByRole("button", { name: he.completionEnlargeExample });
    expect(thumb.querySelector("img")?.getAttribute("src")).toBe("/example.jpg");
    fireEvent.click(thumb);
    expect(document.querySelectorAll("img[src='/example.jpg']").length).toBeGreaterThan(1);
  });

  it("has no thumbnail when the manager gave no example", () => {
    render(<GuidedCameraStage {...props({ guide: { title: "קופה" } })} />);
    expect(screen.queryByRole("button", { name: he.completionEnlargeExample })).toBeNull();
  });

  it("starts recording from the red shutter and cancels from the cross", () => {
    const onPress = vi.fn();
    const onClose = vi.fn();
    render(
      <GuidedCameraStage
        {...props({ onClose, shutter: { kind: "video", recording: false, disabled: false, busy: false, onPress } })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRecord }));
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("flips the camera from the control bar", () => {
    const onFlip = vi.fn();
    render(<GuidedCameraStage {...props({ onFlip })} />);
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureFlipCamera }));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("shows the REC clock and offers to stop while recording", () => {
    render(
      <GuidedCameraStage
        {...props({
          recordingSeconds: 7,
          shutter: { kind: "video", recording: true, disabled: false, busy: false, onPress: vi.fn() },
        })}
      />,
    );
    expect(screen.getByTestId("guided-rec-pill").textContent).toContain("00:07");
    expect(screen.getByRole("button", { name: he.mediaCaptureStop })).toBeTruthy();
  });

  it("hides the REC clock when nothing is recording", () => {
    render(<GuidedCameraStage {...props()} />);
    expect(screen.queryByTestId("guided-rec-pill")).toBeNull();
  });

  it("uses a photo shutter for photo steps and blocks it until the camera is ready", () => {
    render(
      <GuidedCameraStage
        {...props({ shutter: { kind: "photo", recording: false, disabled: true, busy: false, onPress: vi.fn() } })}
      />,
    );
    const shutter = screen.getByRole("button", { name: he.mediaCaptureTakePhoto }) as HTMLButtonElement;
    expect(shutter.disabled).toBe(true);
  });

  it("does not allow closing while the camera is busy", () => {
    render(<GuidedCameraStage {...props({ closeDisabled: true })} />);
    expect((screen.getByRole("button", { name: he.cancel }) as HTMLButtonElement).disabled).toBe(true);
  });
});
