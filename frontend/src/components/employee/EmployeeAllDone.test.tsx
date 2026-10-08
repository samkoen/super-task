import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeAllDone from "./EmployeeAllDone";
import { he } from "../../i18n/he";

describe("EmployeeAllDone", () => {
  it("congratulates the oved and says what happens next", () => {
    render(<EmployeeAllDone />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText(he.noTasksToday)).toBeTruthy();
    expect(screen.getByText(he.employeeAllDoneHint)).toBeTruthy();
  });
});
