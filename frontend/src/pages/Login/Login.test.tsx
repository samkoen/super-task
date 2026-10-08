import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./Login";
import { ApiError } from "../../services/api";
import { he } from "../../i18n/he";

const login = vi.fn();
const navigate = vi.fn();
let currentUser: { role: string } | null = null;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ login, user: currentUser }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../services/authService", () => ({
  authService: { resendVerification: vi.fn() },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function fillAndSubmit(identifier: string, password: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(he.loginIdentifier)), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(he.password), { selector: 'input' }), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: he.login }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    navigate.mockReset();
    currentUser = null;
  });

  it("submits the credentials", async () => {
    login.mockResolvedValue(undefined);
    renderLogin();
    fillAndSubmit("050-1234567", "secret");
    await waitFor(() => expect(login).toHaveBeenCalledWith("050-1234567", "secret"));
  });

  it("shows the server error message on failure", async () => {
    login.mockRejectedValue(new ApiError("פרטים שגויים", 401));
    renderLogin();
    fillAndSubmit("x", "y");
    expect(await screen.findByText("פרטים שגויים")).toBeTruthy();
  });

  it("falls back to the generic error for unknown failures", async () => {
    login.mockRejectedValue(new Error("boom"));
    renderLogin();
    fillAndSubmit("x", "y");
    expect(await screen.findByText(he.errorGeneric)).toBeTruthy();
  });

  it("toggles password visibility", () => {
    renderLogin();
    const input = screen.getByLabelText(new RegExp(he.password), { selector: 'input' }) as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: he.showPassword }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: he.hidePassword }));
    expect(input.type).toBe("password");
  });

  it("redirects an already signed-in user", () => {
    currentUser = { role: "employee" };
    renderLogin();
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("/employee"), { replace: true });
  });
});
