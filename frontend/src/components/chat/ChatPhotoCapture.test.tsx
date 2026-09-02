import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatPhotoCapture, { exportAnnotatedChatPhoto } from "./ChatPhotoCapture";
import { he } from "../../i18n/he";

const camera = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  flip: vi.fn(),
  facing: "environment" as const,
  starting: false,
  active: true,
  error: "",
  onVideoRef: vi.fn(),
  videoRef: { current: {} as HTMLVideoElement },
}));

vi.mock("../../hooks/useCameraStream", () => ({
  useCameraStream: () => camera,
}));

vi.mock("../media/CameraFacingPreview", () => ({
  default: () => <div data-testid="camera-preview" />,
}));

vi.mock("../../utils/mediaCapture", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/mediaCapture")>();
  return {
    ...actual,
    capturePhotoFromVideo: vi.fn().mockResolvedValue(new Blob(["shot"], { type: "image/jpeg" })),
    normalizePhotoOrientation: vi.fn(async (blob: Blob) => blob),
  };
});

vi.mock("../media/PhotoAnnotationCanvas", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  const { he: labels } = await import("../../i18n/he");
  return {
    default: forwardRef(function MockPhotoAnnotationCanvas(
      _props: unknown,
      ref: React.ForwardedRef<{ exportFile: () => Promise<File> }>,
    ) {
      useImperativeHandle(ref, () => ({
        exportFile: async () => new File(["marked"], "chat-photo.jpg", { type: "image/jpeg" }),
      }));
      return (
        <div>
          <button type="button" aria-label={labels.photoAnnotateEllipse} />
          <button type="button" aria-label={labels.photoAnnotateArrow} />
        </div>
      );
    }),
  };
});

describe("ChatPhotoCapture", () => {
  it("offers dual-camera capture", () => {
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    expect(screen.getByText(he.chatDualCameras)).toBeTruthy();
    expect(screen.getAllByTestId("camera-preview")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText(he.chatDualCameras));
    expect(screen.getAllByTestId("camera-preview")).toHaveLength(2);
  });

  it("offers ellipse and arrow tools after taking a photo", async () => {
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureTakePhoto }));
    await waitFor(() => {
      expect(screen.getByLabelText(he.photoAnnotateEllipse)).toBeTruthy();
      expect(screen.getByLabelText(he.photoAnnotateArrow)).toBeTruthy();
    });
  });

  it("sends the annotated photo after confirm", async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ChatPhotoCapture open uploading={false} onClose={onClose} onSend={onSend} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureTakePhoto }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: he.mediaCaptureUseRecording })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureUseRecording }));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ name: "chat-photo.jpg" }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("keeps the original shot if annotation export fails", async () => {
    const original = new Blob(["raw"], { type: "image/jpeg" });
    const result = await exportAnnotatedChatPhoto(original, {
      exportFile: async () => {
        throw new Error("canvas not ready");
      },
    });
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBe(original.size);
    expect(result.name).toMatch(/^chat-photo-/);
  });
});
