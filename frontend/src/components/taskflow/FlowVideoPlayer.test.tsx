import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowVideoPlayer from "./FlowVideoPlayer";

function renderPlayer() {
  render(<FlowVideoPlayer src="blob:x" durationSeconds={38} />);
  return screen.getByTestId("flow-review-video") as HTMLVideoElement;
}

describe("FlowVideoPlayer playback speed", () => {
  it("offers 0.5× and 1×, starting at normal speed", () => {
    const video = renderPlayer();
    expect(screen.getByTestId("flow-speed-1").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("flow-speed-0.5").getAttribute("aria-pressed")).toBe("false");
    expect(video.playbackRate).toBe(1);
  });

  it("slows the video down at 0.5× and comes back to 1×", () => {
    const video = renderPlayer();
    fireEvent.click(screen.getByTestId("flow-speed-0.5"));
    expect(video.playbackRate).toBe(0.5);
    expect(screen.getByTestId("flow-speed-0.5").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("flow-speed-1"));
    expect(video.playbackRate).toBe(1);
  });
});
