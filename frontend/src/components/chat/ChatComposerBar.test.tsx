import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatComposerBar from "./ChatComposerBar";
import { he } from "../../i18n/he";

const audioState = vi.hoisted(() => ({
  supported: true,
  recording: false,
  paused: false,
  blob: null as Blob | null,
  error: "",
  elapsedSeconds: 0,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  stopAndWait: vi.fn().mockResolvedValue(null),
  reset: vi.fn(),
}));

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => audioState,
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
    audioState.recording = false;
    audioState.paused = false;
    audioState.blob = null;
    audioState.start.mockClear();
    audioState.reset.mockClear();
    audioState.stopAndWait.mockReset();
    audioState.stopAndWait.mockResolvedValue(null);
    URL.createObjectURL = vi.fn(() => "blob:audio");
    URL.revokeObjectURL = vi.fn();
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
    expect(screen.getByLabelText(he.chatRecordAudio)).toBeTruthy();
    expect(screen.getByPlaceholderText(he.taskChatPlaceholder)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskChatSend })).toBeTruthy();
    expect(screen.getByLabelText(he.chatCameraAction)).toBeTruthy();
    expect(screen.getByLabelText(he.chatAttachFile)).toBeTruthy();
  });

  it("starts recording immediately on mic tap without a dialog", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.chatRecordAudio));
    expect(audioState.start).toHaveBeenCalled();
    expect(screen.getByLabelText(he.chatAudioPlay)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.chatAudioPause })).toBeTruthy();
    expect(screen.getByLabelText(he.chatAudioSend)).toBeTruthy();
    expect(screen.getByLabelText(he.chatAudioDiscard)).toBeTruthy();
    expect(screen.queryByText(he.mediaCaptureAudioTitle)).toBeNull();
    expect(screen.queryByText(he.chatAudioButtons)).toBeNull();
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

  it("deletes the recording and returns to the composer", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.chatRecordAudio));
    fireEvent.click(screen.getByLabelText(he.chatAudioDiscard));
    expect(audioState.reset).toHaveBeenCalled();
    expect(screen.getByLabelText(he.chatRecordAudio)).toBeTruthy();
  });

  it("uses a custom placeholder and send label", () => {
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        placeholder={he.directChatPlaceholder}
        sendLabel={he.directChatBroadcast}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText(he.directChatPlaceholder)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.directChatBroadcast })).toBeTruthy();
  });

  it("shows an error and closes the dock when the recording is empty", async () => {
    audioState.stopAndWait.mockResolvedValue(null);
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.chatRecordAudio));
    fireEvent.click(screen.getByLabelText(he.chatAudioSend));
    await waitFor(() => expect(screen.getByText(he.chatAudioEmpty)).toBeTruthy());
    expect(audioState.reset).toHaveBeenCalled();
    expect(screen.queryByLabelText(he.chatAudioSend)).toBeNull();
  });

  it("sends docked audio only once if the send button is tapped twice", async () => {
    const onSendMedia = vi.fn();
    let release: (blob: Blob) => void = () => undefined;
    audioState.stopAndWait.mockReturnValue(
      new Promise<Blob | null>((resolve) => {
        release = (blob) => resolve(blob);
      }),
    );
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={onSendMedia}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.chatRecordAudio));
    const send = screen.getByLabelText(he.chatAudioSend);
    fireEvent.click(send);
    fireEvent.click(send);
    expect(audioState.stopAndWait).toHaveBeenCalledTimes(1);
    release(new Blob(["x"], { type: "audio/webm" }));
    await waitFor(() => {
      expect(onSendMedia).toHaveBeenCalledTimes(1);
    });
  });

  it("sends the recording from the dock", async () => {
    const onSendMedia = vi.fn();
    audioState.stopAndWait.mockResolvedValue(new Blob(["x"], { type: "audio/webm" }));
    render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={onSendMedia}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.chatRecordAudio));
    fireEvent.click(screen.getByLabelText(he.chatAudioSend));
    await waitFor(() => {
      expect(audioState.stopAndWait).toHaveBeenCalled();
      expect(onSendMedia).toHaveBeenCalledWith(expect.any(File), "audio");
    });
  });

  it("sends a picked document as a file", () => {
    const onSendMedia = vi.fn();
    const { container } = render(
      <ChatComposerBar
        body=""
        onBodyChange={vi.fn()}
        sending={false}
        onSendText={vi.fn()}
        onSendMedia={onSendMedia}
      />,
    );
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["x"], "דוח.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onSendMedia).toHaveBeenCalledWith(file, "file");
  });
});
