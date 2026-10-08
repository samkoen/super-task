import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhotoCaptureDialog } from "./MediaCaptureActions";
import type { useCameraStream } from "../../hooks/useCameraStream";
import { he } from "../../i18n/he";

function camera(): ReturnType<typeof useCameraStream> {
  return {
    supported: true,
    active: false,
    starting: false,
    error: "",
    stream: null,
    facing: "environment",
    onVideoRef: () => undefined,
    start: async () => "ready",
    flip: async () => undefined,
    stop: () => undefined,
    videoRef: { current: null },
  };
}

describe("new task photo step file pick", () => {
  it("shows a file button next to continue without photo and uses the chosen image", async () => {
    const onCapture = vi.fn();
    const onClose = vi.fn();
    render(
      <PhotoCaptureDialog
        open
        uploading={false}
        camera={camera()}
        onClose={onClose}
        onSkip={vi.fn()}
        onCapture={onCapture}
      />,
    );
    expect(screen.getByRole("button", { name: he.newTaskSkipPhoto })).toBeTruthy();
    const file = new File(["x"], "shelf.jpg", { type: "image/jpeg" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    expect(onCapture).toHaveBeenCalledWith(file);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows a face guide and instruction for avatar capture only", () => {
    const { unmount } = render(
      <PhotoCaptureDialog
        open
        uploading={false}
        camera={camera()}
        onClose={vi.fn()}
        onCapture={vi.fn()}
        annotate={false}
        faceGuide
      />,
    );
    expect(screen.getByText(he.avatarCaptureHint)).toBeTruthy();
    expect(screen.getByTestId("face-guide")).toBeTruthy();
    unmount();
    render(
      <PhotoCaptureDialog open uploading={false} camera={camera()} onClose={vi.fn()} onCapture={vi.fn()} />,
    );
    expect(screen.queryByTestId("face-guide")).toBeNull();
    expect(screen.queryByText(he.avatarCaptureHint)).toBeNull();
  });

  it("closes from the X button", () => {
    const onClose = vi.fn();
    render(
      <PhotoCaptureDialog open uploading={false} camera={camera()} onClose={onClose} onCapture={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not offer a file when there is no skip action", () => {
    render(
      <PhotoCaptureDialog
        open
        uploading={false}
        camera={camera()}
        onClose={vi.fn()}
        onCapture={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: he.addReferenceFromFile })).toBeNull();
  });
});
