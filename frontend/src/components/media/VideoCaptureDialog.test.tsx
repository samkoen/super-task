import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VideoCaptureDialog from "./VideoCaptureDialog";
import { he } from "../../i18n/he";
import type { useVideoRecorder } from "../../hooks/useVideoRecorder";

vi.mock("../../utils/videoUpload", () => ({
  snapshotMediaFile: async (file: File) => file,
}));

type Recorder = ReturnType<typeof useVideoRecorder>;

function recorder(overrides: Partial<Recorder> = {}): Recorder {
  return {
    supported: true,
    previewReady: true,
    starting: false,
    recording: false,
    blob: null,
    elapsedSeconds: 0,
    error: "",
    stream: null,
    facing: "environment",
    videoRef: { current: null },
    onVideoRef: vi.fn(),
    startPreview: vi.fn(async () => undefined),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    stopAndWait: vi.fn(async () => null),
    cleanup: vi.fn(),
    reset: vi.fn(),
    flip: vi.fn(),
    ...overrides,
  } as unknown as Recorder;
}

function renderDialog(rec: Recorder, minSeconds: number | null = 10, extra: Partial<{ onCapture: () => void; onClose: () => void }> = {}) {
  const onClose = extra.onClose ?? vi.fn();
  const onCapture = extra.onCapture ?? vi.fn();
  render(
    <VideoCaptureDialog
      open
      uploading={false}
      recorder={rec}
      minSeconds={minSeconds}
      onClose={onClose}
      onCapture={onCapture}
    />,
  );
  return { onClose, onCapture };
}

const videoBlob = () => new Blob(["video"], { type: "video/webm" });

describe("VideoCaptureDialog", () => {
  beforeAll(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:recorded"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("tells the oved how long to film before recording starts", () => {
    const rec = recorder();
    renderDialog(rec, 10);
    expect(screen.getByText(he.mediaCaptureVideoReady(10))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRecord }));
    expect(rec.startRecording).toHaveBeenCalledTimes(1);
  });

  it("counts down the missing seconds while recording", () => {
    renderDialog(recorder({ recording: true, elapsedSeconds: 3 }), 10);
    expect(screen.getByTestId("recording-clock").textContent).toContain("00:03");
    expect(screen.getByText(he.mediaCaptureVideoKeepGoing(7))).toBeTruthy();
    expect(screen.getByRole("button", { name: he.mediaCaptureStop })).toBeTruthy();
    expect((screen.getByRole("button", { name: he.close }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says it is fine to stop once the minimum is reached", () => {
    renderDialog(recorder({ recording: true, elapsedSeconds: 11 }), 10);
    expect(screen.getByText(he.mediaCaptureVideoEnough)).toBeTruthy();
  });

  it("does not talk about a minimum when none is required", () => {
    renderDialog(recorder({ recording: true, elapsedSeconds: 2 }), null);
    expect(screen.getByText(he.mediaCaptureVideoEnough)).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("only offers to retry when the video is too short", () => {
    renderDialog(recorder({ blob: videoBlob(), elapsedSeconds: 4 }), 10);
    expect(screen.getByText(he.videoTooShort(10))).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.mediaCaptureUseRecording })).toBeNull();
    expect(screen.getAllByRole("button", { name: he.mediaCaptureRetry })).toHaveLength(1);
  });

  it("sends the recording with its duration when it is long enough", async () => {
    const { onCapture, onClose } = renderDialog(recorder({ blob: videoBlob(), elapsedSeconds: 12 }), 10);
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureUseRecording }));
    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    const [file, seconds] = (onCapture as unknown as { mock: { calls: [File, number][] } }).mock.calls[0];
    expect(file.name).toMatch(/^task-video-/);
    expect(seconds).toBe(12);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("restarts the camera preview on retry", () => {
    const rec = recorder({ blob: videoBlob(), elapsedSeconds: 12 });
    renderDialog(rec, 10);
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRetry }));
    expect(rec.reset).toHaveBeenCalledTimes(1);
  });

  it("explains a permission problem in plain words", () => {
    renderDialog(recorder({ error: "permission", previewReady: false }), 10);
    expect(screen.getByText(he.mediaCapturePermission)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.mediaCaptureRetry })).toBeTruthy();
  });
});
