import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskKindPicker from "./TaskKindPicker";
import { he } from "../../../i18n/he";

describe("TaskKindPicker", () => {
  it("explains both kinds and marks the selected one", () => {
    render(<TaskKindPicker value="ad_hoc" onChange={vi.fn()} />);
    expect(screen.getByText(he.taskKindHints.ad_hoc)).toBeTruthy();
    expect(screen.getByText(he.taskKindHints.fixed)).toBeTruthy();
    const adHoc = screen.getByText(he.taskKindLabels.ad_hoc).closest("button");
    const fixed = screen.getByText(he.taskKindLabels.fixed).closest("button");
    expect(adHoc?.getAttribute("aria-pressed")).toBe("true");
    expect(fixed?.getAttribute("aria-pressed")).toBe("false");
  });

  it("reports the kind that was tapped", () => {
    const onChange = vi.fn();
    render(<TaskKindPicker value="ad_hoc" onChange={onChange} />);
    fireEvent.click(screen.getByText(he.taskKindLabels.fixed));
    expect(onChange).toHaveBeenCalledWith("fixed");
  });

  it("ignores taps while disabled", () => {
    const onChange = vi.fn();
    render(<TaskKindPicker value="fixed" onChange={onChange} disabled />);
    fireEvent.click(screen.getByText(he.taskKindLabels.ad_hoc));
    expect(onChange).not.toHaveBeenCalled();
  });
});
