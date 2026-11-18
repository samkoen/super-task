import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ViewAsExitFab from "./ViewAsExitFab";
import { he } from "../../i18n/he";

const mocks = vi.hoisted(() => ({
  exitViewAs: vi.fn(),
  user: null as null | { id: string; role: string; is_preview?: boolean },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, exitViewAs: mocks.exitViewAs }),
}));

describe("ViewAsExitFab", () => {
  beforeEach(() => {
    mocks.exitViewAs.mockReset();
  });

  it("absent quand l'oved s'est connecte lui-meme", () => {
    mocks.user = { id: "e1", role: "employee" };
    render(<ViewAsExitFab />);
    expect(screen.queryByRole("button", { name: he.viewAsExit })).toBeNull();
  });

  it("en צפייה כעובד, ramene au menahel", async () => {
    mocks.user = { id: "e1", role: "employee", is_preview: true };
    mocks.exitViewAs.mockResolvedValue(undefined);
    render(<ViewAsExitFab />);
    fireEvent.click(screen.getByRole("button", { name: he.viewAsExit }));
    await waitFor(() => expect(mocks.exitViewAs).toHaveBeenCalledTimes(1));
  });
});
