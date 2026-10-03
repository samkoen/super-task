import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CompletionSlotTile from "./CompletionSlotTile";
import { he } from "../../i18n/he";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    photoAdded,
    videoAdded,
    photoLabel,
    videoLabel,
    photoDoneLabel,
    videoDoneLabel,
    allowedKinds,
  }: {
    photoAdded?: boolean;
    videoAdded?: boolean;
    photoLabel?: string;
    videoLabel?: string;
    photoDoneLabel?: string;
    videoDoneLabel?: string;
    allowedKinds?: string[];
  }) => (
    <button type="button">
      {allowedKinds?.[0] === "video"
        ? videoAdded
          ? videoDoneLabel
          : videoLabel
        : photoAdded
          ? photoDoneLabel
          : photoLabel}
    </button>
  ),
}));

vi.mock("../../hooks/useVideoPoster", () => ({
  useVideoPoster: () => "data:image/jpeg;base64,poster",
}));

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({
    src: path?.startsWith("blob:") ? path : path ? `blob:kept-${path}` : null,
    loading: false,
    failed: false,
    onError: () => undefined,
  }),
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

  it("shows a kept remote video after reopen as already filled", () => {
    const onEnlarge = vi.fn();
    render(
      <CompletionSlotTile
        req={{ kind: "video", title: "צילום של בסטות", min_seconds: 10 }}
        index={1}
        fill={{ url: "/uploads/v2.mp4", kind: "video" }}
        interactive
        onCapture={vi.fn()}
        onEnlarge={onEnlarge}
      />,
    );
    expect(screen.getByRole("button", { name: he.completionPlayVideo })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.completionRetake })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.completionPlayVideo }));
    expect(onEnlarge).toHaveBeenCalledWith("blob:kept-/uploads/v2.mp4", "video");
  });

  it("shows the uploaded poster and a spinner while the video is mounting", () => {
    render(
      <CompletionSlotTile
        req={{ kind: "video", title: "צילום של בסטות", min_seconds: 10 }}
        index={0}
        fill={{ url: "/v.mp4", posterUrl: "/poster.jpg", kind: "video", pending: true }}
        interactive={false}
      />,
    );
    expect(screen.getByAltText("צילום של בסטות").getAttribute("src")).toBe("blob:kept-/poster.jpg");
    expect(screen.getByText(he.reviewVideoLoading)).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.completionPlayVideo })).toBeNull();
  });

  it("shows the take-photo button under an empty required photo", () => {
    render(
      <CompletionSlotTile
        req={{ kind: "photo", title: "מדף חלב" }}
        index={0}
        fill={null}
        interactive
        onCapture={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.completionTakePhoto })).toBeTruthy();
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
