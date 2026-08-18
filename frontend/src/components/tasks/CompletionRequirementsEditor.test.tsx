import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
import { he } from "../../i18n/he";
import {
  addRequirement,
  effectiveRequirements,
  meetsCompletionRequirements,
  removeRequirement,
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
