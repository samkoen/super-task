import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SkippedSlotsSection from "./SkippedSlotsSection";
import { he } from "../../../i18n/he";

vi.mock("../../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));
vi.mock("../../media/CompactAudioPlayer", () => ({
  default: ({ src }: { src: string }) => <audio data-testid="player" src={src} />,
}));

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "בסטה" },
  { kind: "video" as const, title: "מקרר" },
];

describe("SkippedSlotsSection (manager review)", () => {
  it("shows nothing when every sub-task was filmed", () => {
    const { container } = render(<SkippedSlotsSection requirements={reqs} attachments={[{ kind: "video", url: "/a.mp4" }]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the sub-task, the reason, the text and a player for the voice explanation", () => {
    render(
      <SkippedSlotsSection
        requirements={reqs}
        attachments={[
          { kind: "video", url: "/a.mp4" },
          { kind: "video", skipped: { reason_code: "other", reason_text: "הדלת נעולה", audio_url: "/s.webm" } },
        ]}
      />,
    );
    expect(screen.getByText(he.flowSkipManagerTitle)).toBeTruthy();
    const item = screen.getByTestId("skipped-slot");
    expect(within(item).getByText("בסטה")).toBeTruthy();
    expect(within(item).getByTestId("skipped-slot-reason").textContent).toBe(he.flowSkipReasonOther);
    expect(within(item).getByTestId("skipped-slot-text").textContent).toBe("הדלת נעולה");
    expect(within(item).getByTestId("player").getAttribute("src")).toBe("/s.webm");
  });

  it("lists several skipped sub-tasks and says when no detail was added", () => {
    render(
      <SkippedSlotsSection
        requirements={reqs}
        attachments={[
          { kind: "video", skipped: { reason_code: "area_blocked" } },
          { kind: "video", url: "/b.mp4" },
          { kind: "video", skipped: { reason_code: "camera_issue" } },
        ]}
      />,
    );
    const items = screen.getAllByTestId("skipped-slot");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByTestId("skipped-slot-reason").textContent).toBe(he.flowSkipReasonAreaBlocked);
    expect(within(items[1]).getByTestId("skipped-slot-reason").textContent).toBe(he.flowSkipReasonCameraIssue);
    expect(within(items[0]).getByText(he.flowSkipManagerNoDetails)).toBeTruthy();
    expect(screen.queryByTestId("skipped-slot-audio")).toBeNull();
  });
});
