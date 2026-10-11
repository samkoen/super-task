import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import OptionalCaptureAccordion from "./OptionalCaptureAccordion";
import { he } from "../../i18n/he";
import type { ExtraSlot } from "../../utils/extraCompletionMedia";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    onCapture,
    disabled,
  }: {
    disabled?: boolean;
    onCapture: (file: File, kind: "photo" | "video" | "audio") => void;
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={() => onCapture(new File(["s"], "s.webm"), "audio")}>
        {he.addAudio}
      </button>
      <button type="button" disabled={disabled} onClick={() => onCapture(new File(["a"], "a.jpg"), "photo")}>
        {he.addPhoto}
      </button>
      <button type="button" disabled={disabled} onClick={() => onCapture(new File(["v"], "v.webm"), "video")}>
        {he.addVideo}
      </button>
    </div>
  ),
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null) => path,
}));

function renderAccordion(
  overrides: Partial<{
    note: string;
    extras: ExtraSlot[];
    onNoteChange: (value: string) => void;
    onExtrasChange: (next: ExtraSlot[]) => void;
  }> = {},
) {
  const onNoteChange = vi.fn<(value: string) => void>();
  const onExtrasChange = vi.fn<(next: ExtraSlot[]) => void>();
  if (overrides.onNoteChange) onNoteChange.mockImplementation(overrides.onNoteChange);
  if (overrides.onExtrasChange) onExtrasChange.mockImplementation(overrides.onExtrasChange);
  render(
    <OptionalCaptureAccordion
      note={overrides.note ?? ""}
      onNoteChange={onNoteChange}
      extras={overrides.extras ?? []}
      onExtrasChange={onExtrasChange}
    />,
  );
  return { onNoteChange, onExtrasChange };
}

describe("OptionalCaptureAccordion", () => {
  beforeEach(() => {
    let seq = 0;
    vi.stubGlobal(
      "URL",
      class {
        static createObjectURL = vi.fn(() => `blob:extra-${++seq}`);
        static revokeObjectURL = vi.fn();
      },
    );
  });

  it("shows one accordion with text, audio, photo and video icons on a single row", () => {
    renderAccordion();
    const row = screen.getByTestId("optional-capture-icons");
    expect(getComputedStyle(row).flexDirection).not.toBe("column");
    const icons = within(row).getAllByRole("button");
    expect(icons.map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      he.captureAddText,
      he.addAudio,
      he.addPhoto,
      he.addVideo,
    ]);
    expect(screen.getByText(he.captureOptionalToggle)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.captureOptionalToggle })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.captureNoteToggle })).toBeNull();
    expect(screen.queryByRole("button", { name: he.captureExtrasToggle })).toBeNull();
  });

  it("opens the note field when the text icon is pressed", () => {
    const { onNoteChange } = renderAccordion();
    const toggle = screen.getByRole("button", { name: he.captureOptionalToggle });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: he.captureAddText }));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByLabelText(he.note), { target: { value: "בוצע" } });
    expect(onNoteChange).toHaveBeenCalledWith("בוצע");
  });

  it("adds an extra photo from the image icon without a second accordion", () => {
    const { onExtrasChange } = renderAccordion();
    fireEvent.click(screen.getByRole("button", { name: he.addPhoto }));
    expect(onExtrasChange).toHaveBeenCalledTimes(1);
    const next = onExtrasChange.mock.calls[0][0] as ExtraSlot[];
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("photo");
    expect(screen.getByRole("button", { name: he.captureOptionalToggle }).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("starts open when a note already exists and stays a single accordion", () => {
    renderAccordion({ note: "כבר כתבתי" });
    expect(screen.getByRole("button", { name: he.captureOptionalToggle }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByLabelText(he.note)).toBeTruthy();
    expect(screen.queryByText(he.captureNoteToggle)).toBeNull();
    expect(screen.queryByText(he.captureExtrasToggle)).toBeNull();
  });
});
