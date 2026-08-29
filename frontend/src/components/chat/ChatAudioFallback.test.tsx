import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AudioFallbackDialog } from "./ChatAudioFallback";
import { he } from "../../i18n/he";

const audioState = {
  supported: true,
  recording: false,
  blob: null as Blob | null,
  error: "",
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
};

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => audioState,
}));

describe("AudioFallbackDialog", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:audio");
    URL.revokeObjectURL = vi.fn();
  });

  it("offers start and a disabled send before a recording exists", () => {
    audioState.recording = false;
    audioState.blob = null;
    render(
      <AudioFallbackDialog open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: he.chatAudioStart })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskChatSend })).toHaveProperty("disabled", true);
  });

  it("offers delete and send after a recording", () => {
    audioState.blob = new Blob(["x"], { type: "audio/webm" });
    render(
      <AudioFallbackDialog open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: he.chatAudioDiscard })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskChatSend })).toHaveProperty("disabled", false);
  });

  it("starts recording from the fallback buttons", () => {
    audioState.blob = null;
    audioState.recording = false;
    render(
      <AudioFallbackDialog open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.chatAudioStart }));
    expect(audioState.start).toHaveBeenCalled();
  });
});
