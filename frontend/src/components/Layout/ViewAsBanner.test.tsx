import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ViewAsBanner from "./ViewAsBanner";
import { he } from "../../i18n/he";

const mocks = vi.hoisted(() => ({
  exitViewAs: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "e1",
      full_name: "דני עובד",
      role: "employee",
      is_preview: true,
    },
    exitViewAs: mocks.exitViewAs,
  }),
}));

describe("ViewAsBanner", () => {
  it("shows the oved name and exits on click", async () => {
    mocks.exitViewAs.mockResolvedValue(undefined);
    render(<ViewAsBanner />);
    expect(screen.getByText(`${he.viewAsEmployeeBanner}: דני עובד`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.viewAsExit }));
    await waitFor(() => {
      expect(mocks.exitViewAs).toHaveBeenCalledTimes(1);
    });
  });
});
