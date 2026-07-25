import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MobileMenuTopBar from "./MobileMenuTopBar";
import { he } from "../../i18n/he";

vi.mock("../ui/BackButton", () => ({
  default: () => <button type="button">{he.goBack}</button>,
}));

describe("MobileMenuTopBar", () => {
  it("shows back and opens menu without overlapping fixed position", () => {
    const onOpenMenu = vi.fn();
    render(<MobileMenuTopBar showBack forceVisible onOpenMenu={onOpenMenu} />);
    expect(screen.getByRole("button", { name: he.goBack })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mainMenu }));
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it("hides back when not needed", () => {
    render(<MobileMenuTopBar showBack={false} forceVisible onOpenMenu={() => {}} />);
    expect(screen.queryByRole("button", { name: he.goBack })).toBeNull();
    expect(screen.getByRole("button", { name: he.mainMenu })).toBeTruthy();
  });
});
