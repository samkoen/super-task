import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskAdvancedFields, { type TaskAdvancedValue } from "./TaskAdvancedFields";
import { he } from "../../../i18n/he";

const value: TaskAdvancedValue = { startUrl: "", opsCategory: "", isWorkStart: false, isWorkEnd: false };

describe("TaskAdvancedFields", () => {
  it("is folded by default and only offers the link for a one-off task", () => {
    render(<TaskAdvancedFields taskKind="ad_hoc" value={value} onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: he.taskAdvancedOptions }).getAttribute("aria-expanded"),
    ).toBe("false");
    expect(screen.getByLabelText(he.startUrl)).toBeTruthy();
    expect(screen.queryByLabelText(he.opsCategory)).toBeNull();
    expect(screen.queryByText(he.workStartTask)).toBeNull();
  });

  it("reports the typed link", () => {
    const onChange = vi.fn();
    render(<TaskAdvancedFields taskKind="ad_hoc" value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(he.startUrl), { target: { value: "https://a.b" } });
    expect(onChange).toHaveBeenCalledWith({ startUrl: "https://a.b" });
  });

  it("start and end of work exclude each other for a fixed task", () => {
    const onChange = vi.fn();
    render(
      <TaskAdvancedFields taskKind="fixed" value={{ ...value, isWorkEnd: true }} onChange={onChange} open />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(he.workStartTask) }));
    expect(onChange).toHaveBeenCalledWith({ isWorkStart: true, isWorkEnd: false });
  });

  it("can be forced open by the parent", () => {
    render(<TaskAdvancedFields taskKind="ad_hoc" value={value} onChange={vi.fn()} open />);
    expect(
      screen.getByRole("button", { name: he.taskAdvancedOptions }).getAttribute("aria-expanded"),
    ).toBe("true");
  });
});
