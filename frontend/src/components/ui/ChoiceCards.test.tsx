import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChoiceCards from "./ChoiceCards";

const options = [
  { value: "a" as const, label: "אפשרות א", hint: "הסבר א" },
  { value: "b" as const, label: "אפשרות ב" },
];

describe("ChoiceCards", () => {
  it("marks the selected card and shows hints when given", () => {
    render(<ChoiceCards options={options} value="a" onChange={vi.fn()} ariaLabel="בחירה" />);
    expect(screen.getByText("הסבר א")).toBeTruthy();
    expect(screen.getByText("אפשרות א").closest("button")?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("אפשרות ב").closest("button")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("reports the tapped card", () => {
    const onChange = vi.fn();
    render(<ChoiceCards options={options} value="a" onChange={onChange} ariaLabel="בחירה" />);
    fireEvent.click(screen.getByText("אפשרות ב"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("does nothing while disabled", () => {
    const onChange = vi.fn();
    render(<ChoiceCards options={options} value="a" onChange={onChange} ariaLabel="בחירה" disabled />);
    fireEvent.click(screen.getByText("אפשרות ב"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
