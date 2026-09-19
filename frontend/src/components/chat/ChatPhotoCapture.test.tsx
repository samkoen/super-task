import { beforeEach, describe, expect, it, vi } from "vitest";
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

const video = vi.hoisted(() => ({
  startPreview: vi.fn().mockResolvedValue("ready"),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  cleanup: vi.fn(),
  reset: vi.fn(),
  flip: vi.fn(),
  onVideoRef: vi.fn(),
  facing: "environment" as const,
  recording: false,
  previewReady: false,
  starting: false,
  blob: null as Blob | null,
  elapsedSeconds: 0,
  error: "",
}));

vi.mock("../../hooks/useCameraStream", () => ({
  useCameraStream: () => camera,
}));

vi.mock("../../hooks/useVideoRecorder", () => ({
  useVideoRecorder: () => video,
}));

vi.mock("../media/CameraFacingPreview", async () => {
  const { he: labels } = await import("../../i18n/he");
  return {
    default: ({ flipDisabled }: { flipDisabled?: boolean }) => (
      <div>
        <div data-testid="camera-preview" />
        <button type="button" aria-label={labels.mediaCaptureFlipCamera} disabled={flipDisabled} />
      </div>
    ),
  };
});

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
  beforeEach(() => {
    camera.start.mockClear();
    camera.stop.mockClear();
    video.startPreview.mockClear();
    video.startRecording.mockClear();
    video.stopRecording.mockClear();
    video.cleanup.mockClear();
    video.recording = false;
    video.blob = null;
    video.previewReady = false;
    video.starting = false;
    video.error = "";
  });

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
      expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ name: "chat-photo.jpg" }), "photo");
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

  it("shows photo, video, flip and close on the live camera", () => {
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: he.cancel })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.mediaCaptureTakePhoto })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.chatCaptureVideo })).toBeTruthy();
    expect(screen.getByLabelText(he.mediaCaptureFlipCamera)).toBeTruthy();
  });

  it("starts video recording from the video button", async () => {
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.chatCaptureVideo }));
    await waitFor(() => {
      expect(video.startPreview).toHaveBeenCalled();
      expect(video.startRecording).toHaveBeenCalled();
    });
    expect(camera.stop).toHaveBeenCalled();
  });

  it("shows stop while a chat video is recording", async () => {
    video.recording = true;
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.chatCaptureVideo }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: he.mediaCaptureStop })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: he.mediaCaptureTakePhoto })).toBeNull();
    expect((screen.getByLabelText(he.mediaCaptureFlipCamera) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("annotates a native seed photo without opening the live camera", () => {
    render(
      <ChatPhotoCapture
        open
        seedBlob={new Blob(["jpg"], { type: "image/jpeg" })}
        uploading={false}
        onClose={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("camera-preview")).toBeNull();
    expect(screen.getByLabelText(he.photoAnnotateEllipse)).toBeTruthy();
    expect(camera.start).not.toHaveBeenCalled();
  });
});
