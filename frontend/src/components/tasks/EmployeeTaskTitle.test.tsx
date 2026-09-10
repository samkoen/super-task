import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeTaskTitle from "./EmployeeTaskTitle";
import { he } from "../../i18n/he";

describe("EmployeeTaskTitle", () => {
  it("shows a small type icon next to the title", () => {
    render(
      <EmployeeTaskTitle
        task={{ title: "סידור מדף", ops_category: "cleaning" }}
      />,
    );
    expect(screen.getByText("סידור מדף")).toBeTruthy();
    expect(screen.getByTitle(he.opsCategoryLabels.cleaning)).toBeTruthy();
  });

  it("hides the type icon when the task has no category", () => {
    render(<EmployeeTaskTitle task={{ title: "משימה כללית" }} />);
    expect(screen.getByText("משימה כללית")).toBeTruthy();
    expect(screen.queryByTitle(he.opsCategoryLabels.cleaning)).toBeNull();
    expect(screen.queryByTitle(he.opsCategoryLabels.orders)).toBeNull();
  });

  it("keeps the hebrew subtitle under the title row", () => {
    render(
      <EmployeeTaskTitle
        task={{
          title: "Shelf",
          title_he: "מדף",
          display_language: "en",
          ops_category: "orders",
        }}
      />,
    );
    expect(screen.getByText("Shelf")).toBeTruthy();
    expect(screen.getByText(`${he.taskTitleHebrew}: מדף`)).toBeTruthy();
    expect(screen.getByTitle(he.opsCategoryLabels.orders)).toBeTruthy();
  });
});
