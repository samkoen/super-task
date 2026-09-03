import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";

vi.mock("../media/MediaCaptureActions", () => ({
  default: () => <div>capture</div>,
}));
import { he } from "../../i18n/he";
import {
  addRequirement,
  effectiveRequirements,
  meetsCompletionRequirements,
  removeRequirement,
  setRequirementHint,
  setRequirementTitle,
} from "../../utils/completionMedia";

describe("completion requirements editor helpers", () => {
  it("adds two videos with independent durations", () => {
    const withPhoto = addRequirement([], "photo");
    const withTwoVideos = addRequirement(addRequirement(withPhoto, "video"), "video");
    expect(withTwoVideos).toEqual([
      { kind: "photo" },
      { kind: "video", min_seconds: 10 },
      { kind: "video", min_seconds: 10 },
    ]);
    expect(removeRequirement(withTwoVideos, 1)).toHaveLength(2);
  });

  it("empty list means no media required", () => {
    expect(meetsCompletionRequirements([], [])).toBe(true);
  });

  it("rejects missing second video", () => {
    const reqs = addRequirement(addRequirement([], "video"), "video");
    expect(
      meetsCompletionRequirements(reqs, [{ kind: "video", durationSeconds: 12 }]),
    ).toBe(false);
    expect(
      meetsCompletionRequirements(reqs, [
        { kind: "video", durationSeconds: 12 },
        { kind: "video", durationSeconds: 10 },
      ]),
    ).toBe(true);
  });
});

describe("CompletionRequirementsEditor", () => {
  it("lets the menahel name a visual slot", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "photo" }]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(he.completionSlotTitleHint), {
      target: { value: "מדף חלב" },
    });
    expect(onChange).toHaveBeenCalledWith(
      setRequirementTitle([{ kind: "photo" }], 0, "מדף חלב"),
    );
  });

  it("lets the menahel add an optional hint on an untitled photo", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "photo" }]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(he.completionSlotHintHint), {
      target: { value: "לצלם את כל השורה" },
    });
    expect(onChange).toHaveBeenCalledWith(
      setRequirementHint([{ kind: "photo" }], 0, "לצלם את כל השורה"),
    );
  });

  it("does not open a photo card for each word", () => {
    render(
      <CompletionRequirementsEditor
        value={[
          { kind: "photo", title: "חלב" },
          { kind: "photo", title: "לחם" },
        ]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("חלב")).toBeTruthy();
    expect(screen.getByText("לחם")).toBeTruthy();
    expect(screen.queryByPlaceholderText(he.completionSlotTitleHint)).toBeNull();
    expect(screen.queryByPlaceholderText(he.completionSlotHintHint)).toBeNull();
    expect(screen.queryByText(he.completionSlotExample)).toBeNull();
  });

  it("lets the menahel add a second video", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CompletionRequirementsEditor value={[]} onChange={onChange} />,
    );
    expect(screen.getByText(he.completionNoRequirements)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.completionAddVideoReq }));
    expect(onChange).toHaveBeenCalledWith([{ kind: "video", min_seconds: 10 }]);
    rerender(
      <CompletionRequirementsEditor
        value={[{ kind: "video", min_seconds: 10 }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.completionAddVideoReq }));
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "video", min_seconds: 10 },
      { kind: "video", min_seconds: 10 },
    ]);
  });

  it("turns entered words into named photo slots", () => {
    const onChange = vi.fn();
    render(<CompletionRequirementsEditor value={[]} onChange={onChange} />);
    const input = screen.getByLabelText(he.completionWordList);
    fireEvent.change(input, { target: { value: "חלב" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith([{ kind: "photo", title: "חלב" }]);
  });

  it("adds several words from a pasted list and keeps video", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "video", min_seconds: 10 }]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(he.completionWordList), {
      target: { value: "חלב,לחם" },
    });
    expect(onChange).toHaveBeenCalledWith([
      { kind: "photo", title: "חלב" },
      { kind: "photo", title: "לחם" },
      { kind: "video", min_seconds: 10 },
    ]);
  });
});

describe("effectiveRequirements", () => {
  it("keeps an explicit empty list", () => {
    expect(effectiveRequirements({ completion_requirements: [] })).toEqual([]);
  });
});
