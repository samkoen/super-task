import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuickTimePresets from "./QuickTimePresets";
import { he } from "../../i18n/he";
import { followUpPresets } from "../../utils/chatTaskFollowUp";

const presets = followUpPresets(new Date(2026, 9, 8, 14, 30));

describe("QuickTimePresets", () => {
  it("returns the value of the tapped preset", () => {
    const onPick = vi.fn();
    render(<QuickTimePresets presets={presets} selected="" onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: he.followUpTomorrow }));
    expect(onPick).toHaveBeenCalledWith("2026-10-09T09:00");
  });

  it("highlights only the preset that matches the current value", () => {
    render(<QuickTimePresets presets={presets} selected="2026-10-15T09:00" onPick={vi.fn()} />);
    const week = screen.getByRole("button", { name: he.followUpNextWeek });
    expect(week.className).toContain("MuiButton-contained");
    expect(screen.getByRole("button", { name: he.followUpInHour }).className).toContain("MuiButton-outlined");
  });

  it("disables every preset when disabled", () => {
    render(<QuickTimePresets presets={presets} selected="" onPick={vi.fn()} disabled />);
    for (const name of [he.followUpInHour, he.followUpTomorrow, he.followUpNextWeek]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("renders nothing clickable for an empty list", () => {
    render(<QuickTimePresets presets={[]} selected="" onPick={vi.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
