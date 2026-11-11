import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowGuideSheet from "./FlowGuideSheet";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));

describe("FlowGuideSheet", () => {
  it("shows the heading with the slot title, the manager hint and the example image when there is no video", () => {
    render(
      <FlowGuideSheet
        req={{ kind: "video", title: "מקרר ריק", hint: "לצלם מקרוב", example_url: "/e.png" }}
        index={1}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("flow-guide-heading").textContent).toBe(he.flowGuideSheetHeading("מקרר ריק"));
    expect(screen.getByTestId("flow-guide-hint").textContent).toBe("לצלם מקרוב");
    expect(screen.getByTestId("flow-guide-image").getAttribute("src")).toBe("/e.png");
    expect(document.querySelector("video")).toBeNull();
    expect(screen.queryByText(he.flowGuideVideoLabel)).toBeNull();
  });

  it("shows the manager's guide video with a play button, and plays it on tap", () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    render(
      <FlowGuideSheet
        req={{ kind: "video", title: "סרטון גיבוי", guide_video_url: "/v.mp4", example_url: "/p.png" }}
        index={0}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.flowGuideVideoLabel)).toBeTruthy();
    const video = screen.getByTestId("flow-guide-video") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("/v.mp4#t=0.1");
    expect(video.getAttribute("poster")).toBe("/p.png");
    expect(screen.queryByTestId("flow-guide-image")).toBeNull();
    fireEvent.click(screen.getByTestId("flow-guide-play"));
    expect(play).toHaveBeenCalled();
    expect(screen.queryByTestId("flow-guide-play")).toBeNull();
    play.mockRestore();
  });

  it("shows the clip duration pill once the metadata is loaded", () => {
    render(<FlowGuideSheet req={{ kind: "video", guide_video_url: "/v.mp4" }} index={0} onClose={vi.fn()} />);
    expect(screen.queryByTestId("flow-guide-duration")).toBeNull();
    const video = screen.getByTestId("flow-guide-video");
    Object.defineProperty(video, "duration", { value: 80, configurable: true });
    fireEvent.loadedMetadata(video);
    expect(screen.getByTestId("flow-guide-duration").textContent).toBe("01:20");
  });

  it("closes with the understood button and with the X", () => {
    const onClose = vi.fn();
    render(<FlowGuideSheet req={{ kind: "photo", title: "א", example_url: "/e.png" }} index={0} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("flow-guide-close"));
    fireEvent.click(screen.getByTestId("flow-guide-x"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("falls back to a neutral message without video nor image and omits an empty hint", () => {
    render(<FlowGuideSheet req={{ kind: "video", title: "א" }} index={0} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-guide-empty").textContent).toBe(he.flowNoExample);
    expect(screen.queryByTestId("flow-guide-hint")).toBeNull();
  });

  it("stacks above the full-screen task dialog so it does not open behind it", () => {
    render(<FlowGuideSheet req={{ kind: "photo", example_url: "/e.png" }} index={0} onClose={vi.fn()} />);
    const root = document.querySelector(".MuiDrawer-root") as HTMLElement;
    expect(Number(getComputedStyle(root).zIndex)).toBeGreaterThan(1300);
  });

  it("renders nothing while closed", () => {
    render(<FlowGuideSheet req={null} index={0} onClose={vi.fn()} />);
    expect(screen.queryByTestId("flow-guide-close")).toBeNull();
  });
});
