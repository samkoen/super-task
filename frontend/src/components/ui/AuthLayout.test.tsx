import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthLayout from "./AuthLayout";
import { he } from "../../i18n/he";

describe("AuthLayout", () => {
  it("renders the title as the page heading with the hint and the form", () => {
    render(
      <AuthLayout title={he.login}>
        <button type="button">child-action</button>
      </AuthLayout>,
    );
    expect(screen.getByRole("heading", { level: 1, name: he.login })).toBeTruthy();
    expect(screen.getByText(he.authFormHint)).toBeTruthy();
    expect(screen.getByRole("button", { name: "child-action" })).toBeTruthy();
  });

  it("shows the brand band for phones and the pitch panel for desktop", () => {
    render(
      <AuthLayout title={he.login}>
        <span />
      </AuthLayout>,
    );
    expect(screen.getByTestId("auth-mobile-band")).toBeTruthy();
    expect(screen.getAllByText(he.appName).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(he.appSubtitle, { selector: "h3" })).toBeTruthy();
  });
});
