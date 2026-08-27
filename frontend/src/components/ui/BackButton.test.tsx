import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BackButton from "./BackButton";
import { he } from "../../i18n/he";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "branch_manager" } }),
}));

describe("BackButton", () => {
  it("returns to the previous page when history exists", () => {
    navigate.mockReset();
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    render(<BackButton />);
    fireEvent.click(screen.getByRole("button", { name: he.goBack }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("falls back to role home when there is no history", () => {
    navigate.mockReset();
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<BackButton />);
    fireEvent.click(screen.getByRole("button", { name: he.goBack }));
    expect(navigate).toHaveBeenCalledWith("/manager");
  });
});
