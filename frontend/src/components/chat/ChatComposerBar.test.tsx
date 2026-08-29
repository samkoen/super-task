import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ChatComposerBar from "./ChatComposerBar";
import { he } from "../../i18n/he";
import { HOLD_MS } from "../../utils/holdGesture";

const { startAudio, stopAndWaitAudio } = vi.hoisted(() => ({
  startAudio: vi.fn(),
  stopAndWaitAudio: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    supported: true,
    recording: false,
    blob: null,
    error: "",
    start: startAudio,
    stop: vi.fn(),
    stopAndWait: stopAndWaitAudio,
    reset: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVideoRecorder", () => ({
  useVideoRecorder: () => ({
    startPreview: vi.fn().mockResolvedValue("failed"),
    startRecording: vi.fn(),
    stopAndWait: vi.fn().mockResolvedValue(null),
    onVideoRef: vi.fn(),
  }),
}));

vi.mock("./ChatPhotoCapture", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>{he.mediaCapturePhotoTitle}</div> : null),
}));

describe("ChatComposerBar", () => {
  beforeEach(() => {
    startAudio.mockClear();
    stopAndWaitAudio.mockClear();
  });

  it("shows mic, text+send, and camera", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(he.chatHoldToRecord)).toBeTruthy();
    expect(screen.getByPlaceholderText(he.taskChatPlaceholder)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskChatSend })).toBeTruthy();
    expect(screen.getByLabelText(he.chatCameraAction)).toBeTruthy();
  });

  it("opens the button-based audio dialog on a short tap", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    fireEvent.pointerDown(screen.getByLabelText(he.chatHoldToRecord));
    fireEvent.pointerUp(screen.getByLabelText(he.chatHoldToRecord));
    expect(screen.getByText(he.chatAudioButtons)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.chatAudioStart })).toBeTruthy();
  });

  it("opens the camera on a short tap", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    fireEvent.pointerDown(screen.getByLabelText(he.chatCameraAction));
    fireEvent.pointerUp(screen.getByLabelText(he.chatCameraAction));
    expect(screen.getByText(he.mediaCapturePhotoTitle)).toBeTruthy();
  });

  it("starts audio on hold and sends on release", async () => {
    vi.useFakeTimers();
    const onSendMedia = vi.fn();
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={onSendMedia}
      />,
    );
    const mic = screen.getByLabelText(he.chatHoldToRecord);
    fireEvent.pointerDown(mic);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HOLD_MS);
    });
    expect(startAudio).toHaveBeenCalled();
    await act(async () => {
      fireEvent.pointerUp(mic);
    });
    expect(stopAndWaitAudio).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
