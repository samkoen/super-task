import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CompletionSlotTile from "./CompletionSlotTile";
import { he } from "../../i18n/he";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    videoAdded,
    videoLabel,
    videoDoneLabel,
  }: {
    videoAdded?: boolean;
    videoLabel?: string;
    videoDoneLabel?: string;
  }) => <button type="button">{videoAdded ? videoDoneLabel : videoLabel}</button>,
}));

vi.mock("../../hooks/useVideoPoster", () => ({
  useVideoPoster: () => "data:image/jpeg;base64,poster",
}));

describe("CompletionSlotTile", () => {
  it("shows the first frame, play, and retake after a video is captured", () => {
    const onEnlarge = vi.fn();
    render(
      <CompletionSlotTile
        req={{ kind: "video", title: "צילום של בסטות", min_seconds: 10 }}
        index={0}
        fill={{ previewUrl: "blob:oved-video", kind: "video" }}
        interactive
        onCapture={vi.fn()}
        onEnlarge={onEnlarge}
      />,
    );
    expect(screen.getByAltText("צילום של בסטות").getAttribute("src")).toBe("data:image/jpeg;base64,poster");
    expect(screen.getByRole("button", { name: he.completionPlayVideo })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.completionRetake })).toBeTruthy();
    expect(screen.queryByText(he.completionTakeVideo)).toBeNull();
    expect(screen.queryByText(he.completionSlotVideoMin(10))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.completionPlayVideo }));
    expect(onEnlarge).toHaveBeenCalledWith("blob:oved-video", "video");
  });

  it("keeps the take-video label before a video exists", () => {
    render(
      <CompletionSlotTile
        req={{ kind: "video", title: "צילום של בסטות", min_seconds: 10 }}
        index={0}
        fill={null}
        interactive
        onCapture={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.completionTakeVideo })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.completionPlayVideo })).toBeNull();
  });
});
