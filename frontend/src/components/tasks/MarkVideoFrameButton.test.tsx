import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MarkVideoFrameButton from "./MarkVideoFrameButton";
import { he } from "../../i18n/he";

vi.mock("../../utils/videoPoster", () => ({
  capturePausedVideoFrame: vi.fn(),
}));

import { capturePausedVideoFrame } from "../../utils/videoPoster";

function videoRef() {
  return { current: document.createElement("video") };
}

describe("MarkVideoFrameButton", () => {
  it("hands the paused frame to the review", async () => {
    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    vi.mocked(capturePausedVideoFrame).mockResolvedValue(blob);
    vi.stubGlobal("URL", { createObjectURL: () => "blob:frame" });
    const onMarkFrame = vi.fn();
    render(
      <MarkVideoFrameButton videoRef={videoRef()} onMarkFrame={onMarkFrame} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.reviewMarkVideoFrame }));
    await waitFor(() => expect(onMarkFrame).toHaveBeenCalledWith("blob:frame"));
  });

  it("asks to pause when the frame cannot be read", async () => {
    vi.mocked(capturePausedVideoFrame).mockResolvedValue(null);
    const onMarkFrame = vi.fn();
    render(
      <MarkVideoFrameButton videoRef={videoRef()} onMarkFrame={onMarkFrame} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.reviewMarkVideoFrame }));
    expect(await screen.findByText(he.reviewMarkVideoFailed)).toBeTruthy();
    expect(onMarkFrame).not.toHaveBeenCalled();
  });
});
