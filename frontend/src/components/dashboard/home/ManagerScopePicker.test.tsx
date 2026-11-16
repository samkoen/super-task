import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Branch } from "../../../services/branchService";
import { he } from "../../../i18n/he";
import ManagerScopePicker from "./ManagerScopePicker";

const branches = [{ id: "b1", name: "TEST" }, { id: "b2", name: "שפע בבא סאלי" }] as Branch[];

function openMenu() {
  fireEvent.mouseDown(screen.getByRole("combobox"));
  return within(screen.getByRole("listbox"));
}

describe("ManagerScopePicker", () => {
  it("shows « כל הרשת » when no snif is chosen", () => {
    render(<ManagerScopePicker value="" branches={branches} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox").textContent).toBe(he.managerHomeNetworkTitle);
  });

  it("picks a snif, and goes back to the whole network", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ManagerScopePicker value="" branches={branches} onChange={onChange} />);
    fireEvent.click(openMenu().getByText("שפע בבא סאלי"));
    expect(onChange).toHaveBeenLastCalledWith("b2");
    rerender(<ManagerScopePicker value="b2" branches={branches} onChange={onChange} />);
    expect(screen.getByRole("combobox").textContent).toBe("שפע בבא סאלי");
    fireEvent.click(openMenu().getByText(he.managerHomeNetworkTitle));
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
