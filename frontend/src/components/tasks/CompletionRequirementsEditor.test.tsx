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
import { requirementRowLabel } from "../../utils/completionRequirementList";

describe("completion requirements editor helpers", () => {
  it("adds two videos with independent durations", () => {
    const withPhoto = addRequirement([], "photo");
    const withTwoVideos = addRequirement(addRequirement(withPhoto, "video"), "video");
    expect(withTwoVideos).toEqual([
      { kind: "photo", slot: true },
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
  it("lists name and required kind without opening the square", () => {
    render(
      <CompletionRequirementsEditor
        value={[
          { kind: "photo", title: "חלב" },
          { kind: "video", title: "עגבניה", min_seconds: 10 },
          { kind: "photo", title: "מלפפון" },
        ]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: requirementRowLabel({ kind: "photo", title: "חלב" }) })).toBeTruthy();
    expect(screen.getByRole("button", { name: requirementRowLabel({ kind: "video", title: "עגבניה" }) })).toBeTruthy();
    expect(screen.getByRole("button", { name: requirementRowLabel({ kind: "photo", title: "מלפפון" }) })).toBeTruthy();
    expect(screen.queryByPlaceholderText(he.completionSlotTitleHint)).toBeNull();
  });

  it("opens the square on a list row to edit that item", () => {
    render(
      <CompletionRequirementsEditor
        value={[
          { kind: "photo", title: "חלב" },
          { kind: "video", title: "עגבניה", min_seconds: 10 },
        ]}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: requirementRowLabel({ kind: "photo", title: "חלב" }) }));
    expect(screen.getByDisplayValue("חלב")).toBeTruthy();
    expect(screen.getByPlaceholderText(he.completionSlotHintHint)).toBeTruthy();
    expect(screen.queryByDisplayValue("עגבניה")).toBeNull();
  });

  it("keeps the +photo square after naming it instead of adding a word chip", () => {
    const onChange = vi.fn();
    const start = addRequirement([], "photo");
    const { rerender } = render(
      <CompletionRequirementsEditor value={start} onChange={onChange} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: requirementRowLabel({ kind: "photo" }) }),
    );
    fireEvent.change(screen.getByPlaceholderText(he.completionSlotTitleHint), {
      target: { value: "מדף חלב" },
    });
    const named = setRequirementTitle(start, 0, "מדף חלב");
    expect(onChange).toHaveBeenCalledWith(named);
    rerender(<CompletionRequirementsEditor value={named} onChange={onChange} />);
    expect(screen.getByDisplayValue("מדף חלב")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: `${he.completionWordRemove} מדף חלב` }),
    ).toBeNull();
  });

  it("lets the menahel name a visual slot from the open square", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "photo" }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: requirementRowLabel({ kind: "photo" }) }));
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
    fireEvent.click(screen.getByRole("button", { name: requirementRowLabel({ kind: "photo" }) }));
    fireEvent.change(screen.getByPlaceholderText(he.completionSlotHintHint), {
      target: { value: "לצלם את כל השורה" },
    });
    expect(onChange).toHaveBeenCalledWith(
      setRequirementHint([{ kind: "photo" }], 0, "לצלם את כל השורה"),
    );
  });

  it("opens a newly added item square and keeps others closed", () => {
    const onChange = vi.fn();
    const existing = [{ kind: "photo" as const, title: "חלב" }];
    const { rerender } = render(
      <CompletionRequirementsEditor value={existing} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.completionAddVideoReq }));
    expect(onChange).toHaveBeenCalledWith([
      { kind: "photo", title: "חלב" },
      { kind: "video", min_seconds: 10 },
    ]);
    rerender(
      <CompletionRequirementsEditor
        value={[
          { kind: "photo", title: "חלב" },
          { kind: "video", min_seconds: 10 },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText(he.completionSlotTitleHint)).toBeTruthy();
    expect(screen.getByLabelText(he.completionVideoMinSeconds)).toBeTruthy();
    expect(screen.queryByDisplayValue("חלב")).toBeNull();
  });

  it("lets the menahel replace min seconds by clearing the field", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "video", min_seconds: 1 }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: requirementRowLabel({ kind: "video" }) }));
    const field = screen.getByLabelText(he.completionVideoMinSeconds);
    fireEvent.change(field, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith([
      { kind: "video" },
    ]);
    fireEvent.change(field, { target: { value: "36" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "video", min_seconds: 36 },
    ]);
  });

  it("closes the square when the open row is clicked again", () => {
    render(
      <CompletionRequirementsEditor
        value={[{ kind: "photo", title: "חלב" }]}
        onChange={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: requirementRowLabel({ kind: "photo", title: "חלב" }) });
    fireEvent.click(row);
    expect(screen.getByDisplayValue("חלב")).toBeTruthy();
    fireEvent.click(row);
    expect(screen.queryByPlaceholderText(he.completionSlotTitleHint)).toBeNull();
  });

  it("removes a row from the list", () => {
    const onChange = vi.fn();
    render(
      <CompletionRequirementsEditor
        value={[
          { kind: "photo", title: "חלב" },
          { kind: "video", min_seconds: 10 },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: he.removeMedia })[0]);
    expect(onChange).toHaveBeenCalledWith([{ kind: "video", min_seconds: 10 }]);
  });

  it("shows audio title fields without an example photo", () => {
    render(
      <CompletionRequirementsEditor value={[{ kind: "audio" }]} onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: requirementRowLabel({ kind: "audio" }) }));
    expect(screen.getByPlaceholderText(he.completionSlotTitleHint)).toBeTruthy();
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
});

describe("effectiveRequirements", () => {
  it("keeps an explicit empty list", () => {
    expect(effectiveRequirements({ completion_requirements: [] })).toEqual([]);
  });
});
