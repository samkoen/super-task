import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatAudioDock from "./ChatAudioDock";
import { he } from "../../i18n/he";
import type { useAudioRecorder } from "../../hooks/useAudioRecorder";

function recorder(overrides: Partial<ReturnType<typeof useAudioRecorder>> = {}) {
  return {
    supported: true,
    recording: true,
    paused: false,
    blob: null,
    error: "",
    elapsedSeconds: 4,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    stopAndWait: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAudioRecorder>;
}

describe("ChatAudioDock", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:audio");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows play, send, pause and delete without a dialog title", () => {
    render(
      <ChatAudioDock audio={recorder()} sending={false} onSend={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByLabelText(he.chatAudioPlay)).toBeTruthy();
    expect(screen.getByLabelText(he.chatAudioSend)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.chatAudioPause })).toBeTruthy();
    expect(screen.getByLabelText(he.chatAudioDiscard)).toBeTruthy();
    expect(screen.getByText("0:04")).toBeTruthy();
    expect(screen.queryByText(he.mediaCaptureAudioTitle)).toBeNull();
    expect(screen.queryByText(he.chatAudioButtons)).toBeNull();
  });

  it("pauses recording from play while live, and toggles השהה/המשך", () => {
    const audio = recorder();
    const onSend = vi.fn();
    const onDelete = vi.fn();
    render(<ChatAudioDock audio={audio} sending={false} onSend={onSend} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText(he.chatAudioPlay));
    expect(audio.pause).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: he.chatAudioPause }));
    expect(audio.pause).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByLabelText(he.chatAudioSend));
    expect(onSend).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText(he.chatAudioDiscard));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("resumes when already paused", () => {
    const audio = recorder({ paused: true });
    render(<ChatAudioDock audio={audio} sending={false} onSend={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: he.chatAudioResume }));
    expect(audio.resume).toHaveBeenCalledTimes(1);
  });
});
