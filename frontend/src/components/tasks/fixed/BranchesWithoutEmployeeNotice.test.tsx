import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BranchesWithoutEmployeeNotice from "./BranchesWithoutEmployeeNotice";
import { he } from "../../../i18n/he";

describe("BranchesWithoutEmployeeNotice", () => {
  it("names the branches without an employee", () => {
    render(<BranchesWithoutEmployeeNotice names={["חיפה", "אילת"]} />);
    expect(screen.getByTestId("branches-without-employee").textContent).toContain(
      he.fixedTaskBranchesWithoutEmployee("חיפה, אילת"),
    );
  });

  it("renders nothing when every branch has an employee", () => {
    const { container } = render(<BranchesWithoutEmployeeNotice names={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
