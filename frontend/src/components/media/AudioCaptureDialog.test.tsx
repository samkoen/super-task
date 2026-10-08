import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AudioCaptureDialog from "./AudioCaptureDialog";
import { he } from "../../i18n/he";

const recorderState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => recorderState.current,
}));

function setRecorder(overrides: Record<string, unknown> = {}) {
  recorderState.current = {
    supported: true,
    recording: false,
    paused: false,
    blob: null,
    error: "",
    elapsedSeconds: 0,
    start: vi.fn(async () => undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    stopAndWait: vi.fn(async () => null),
    reset: vi.fn(),
    ...overrides,
  };
  return recorderState.current as { start: () => void; stop: () => void; reset: () => void };
}

function renderDialog(onCapture = vi.fn(), onClose = vi.fn()) {
  render(<AudioCaptureDialog open uploading={false} onClose={onClose} onCapture={onCapture} />);
  return { onCapture, onClose };
}

describe("AudioCaptureDialog", () => {
  beforeAll(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:audio"),
      revokeObjectURL: vi.fn(),
    });
  });

  beforeEach(() => setRecorder());

  it("invites to press record and starts on tap", () => {
    const rec = setRecorder();
    renderDialog();
    expect(screen.getByText(he.mediaCaptureAudioReady)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRecord }));
    expect(rec.start).toHaveBeenCalled();
  });

  it("shows a running clock and a stop button while recording", () => {
    const rec = setRecorder({ recording: true, elapsedSeconds: 65 });
    renderDialog();
    expect(screen.getByTestId("recording-clock").textContent).toContain("01:05");
    expect(screen.getByText(he.mediaCaptureAudioSpeaking)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureStop }));
    expect(rec.stop).toHaveBeenCalled();
    expect((screen.getByRole("button", { name: he.close }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("lets the oved listen, retry or confirm once recorded", async () => {
    const blob = new Blob(["a"], { type: "audio/webm" });
    const rec = setRecorder({ blob });
    const { onCapture } = renderDialog();
    expect(document.querySelector("audio")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRetry }));
    expect(rec.reset).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureUseRecording }));
    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    expect((onCapture.mock.calls[0][0] as File).name).toMatch(/^task-audio-/);
  });

  it("disables recording when the device cannot record", () => {
    setRecorder({ supported: false });
    renderDialog();
    expect(screen.getByText(he.mediaCaptureUnsupported)).toBeTruthy();
    expect((screen.getByRole("button", { name: he.mediaCaptureRecord }) as HTMLButtonElement).disabled).toBe(true);
  });
});
