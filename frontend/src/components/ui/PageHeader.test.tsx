import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("renders title and subtitle", () => {
    render(<PageHeader title="סניף: בבא סאלי" subtitle="שלום, מנהל" />);
    expect(screen.getByRole("heading", { name: "סניף: בבא סאלי" })).toBeTruthy();
    expect(screen.getByText("שלום, מנהל")).toBeTruthy();
  });

  it("renders optional action", () => {
    render(
      <PageHeader title="סניף: בבא סאלי" action={<button type="button">פעולה</button>} />,
    );
    expect(screen.getByRole("button", { name: "פעולה" })).toBeTruthy();
  });
});
