import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionSlotGrid from "./CompletionSlotGrid";
import { he } from "../../i18n/he";

vi.mock("../media/MediaCaptureActions", () => ({
  default: () => <div>capture</div>,
}));

vi.mock("../../hooks/useSlotHintPlayback", () => ({
  useSlotHintPlayback: () => ({
    show: vi.fn(),
    speak: vi.fn(),
    speakingId: null,
    loadingId: null,
    dialog: null,
    closeDialog: () => undefined,
    supported: true,
  }),
}));

describe("CompletionSlotGrid audio hints", () => {
  it("shows read and listen on an audio slot with a hint", () => {
    render(
      <CompletionSlotGrid
        requirements={[{ kind: "audio", title: "הקלטה", hint: "תאר מה שומעים" }]}
        fills={[null]}
      />,
    );
    expect(screen.getByText("הקלטה")).toBeTruthy();
    expect(screen.getByLabelText(he.completionShowHint)).toBeTruthy();
    expect(screen.getByLabelText(he.completionListenHint)).toBeTruthy();
  });

  it("shows hint controls when audio has only an explanation", () => {
    render(
      <CompletionSlotGrid
        requirements={[{ kind: "audio", hint: "תאר מה שומעים" }]}
        fills={[null]}
      />,
    );
    expect(screen.getByLabelText(he.completionShowHint)).toBeTruthy();
  });

  it("hides hint controls when audio has no title or hint", () => {
    render(<CompletionSlotGrid requirements={[{ kind: "audio" }]} fills={[null]} />);
    expect(screen.queryByLabelText(he.completionShowHint)).toBeNull();
  });
});
