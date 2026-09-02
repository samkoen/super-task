import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CompactAudioPlayer, { COMPACT_AUDIO_HEIGHT, compactAudioPlayerSx } from "./CompactAudioPlayer";
import { he } from "../../i18n/he";

describe("CompactAudioPlayer", () => {
  it("is one text-line tall, full width, and keeps audio off the layout", () => {
    expect(compactAudioPlayerSx.height).toBe(COMPACT_AUDIO_HEIGHT);
    expect(compactAudioPlayerSx.maxHeight).toBe(COMPACT_AUDIO_HEIGHT);
    expect(compactAudioPlayerSx.width).toBe("100%");
    expect(compactAudioPlayerSx.maxWidth).toBe("100%");
    expect(COMPACT_AUDIO_HEIGHT).toBeLessThanOrEqual(32);
    render(<CompactAudioPlayer src="/uploads/voice.webm" />);
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("toggles playback from the line-sized control", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn(() => ({ play, pause, addEventListener, removeEventListener, preload: "" })),
    );
    render(<CompactAudioPlayer src="/uploads/voice.webm" />);
    fireEvent.click(screen.getByLabelText(he.chatAudioPlay));
    expect(play).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByLabelText(he.chatAudioPause)).toBeTruthy();
    });
    vi.unstubAllGlobals();
  });
});
