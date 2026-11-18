import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FlowChatComposer from "./FlowChatComposer";

vi.mock("../../hooks/useAudioRecorder", async () => {
  const { useMemo, useState } = await import("react");
  return {
    useAudioRecorder: () => {
      const [recording, setRecording] = useState(false);
      const actions = useMemo(
        () => ({
          reset: () => setRecording(false),
          start: async () => setRecording(true),
          stopAndWait: async () => {
            setRecording(false);
            return new Blob(["voice"], { type: "audio/webm" });
          },
        }),
        [],
      );
      return { recording, elapsedSeconds: 3, error: null, ...actions };
    },
  };
});
vi.mock("../chat/ChatPhotoCapture", () => ({ default: () => null }));

function renderComposer(onSendMedia: (file: File) => Promise<boolean>) {
  render(
    <FlowChatComposer placeholder="..." body="" onBodyChange={vi.fn()} sending={false} onSend={vi.fn()} onSendMedia={onSendMedia} />,
  );
}

async function recordVoice() {
  fireEvent.click(screen.getByTestId("flow-chat-mic"));
  fireEvent.click(await screen.findByTestId("flow-chat-voice-stop"));
  await screen.findByTestId("flow-chat-voice-play");
}

describe("FlowChatComposer voice note", () => {
  it("keeps the recording when the upload fails, so it can be sent again", async () => {
    const onSendMedia = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderComposer(onSendMedia);
    await recordVoice();

    fireEvent.click(screen.getByTestId("flow-chat-send"));
    await waitFor(() => expect(onSendMedia).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("flow-chat-voice-play")).toBeTruthy();

    fireEvent.click(screen.getByTestId("flow-chat-send"));
    await waitFor(() => expect(onSendMedia).toHaveBeenCalledTimes(2));
    expect(onSendMedia.mock.calls[1][0]).toBe(onSendMedia.mock.calls[0][0]);
    await waitFor(() => expect(screen.queryByTestId("flow-chat-voice-play")).toBeNull());
    expect(screen.getByTestId("flow-chat-mic")).toBeTruthy();
  });
});
