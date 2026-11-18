import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLogoutGuard } from "./useLogoutGuard";
import { he } from "../../i18n/he";
import type { QueuedSlot } from "../../utils/slotUploadQueue";

function Harness({ logout, entries }: { logout: () => void; entries: Partial<QueuedSlot>[] }) {
  const guard = useLogoutGuard(logout, () => ({ list: async () => entries as QueuedSlot[] }));
  return (
    <>
      <button onClick={guard.requestLogout}>logout</button>
      {guard.dialog}
    </>
  );
}

describe("useLogoutGuard", () => {
  it("logs out at once when no video waits", async () => {
    const logout = vi.fn();
    render(<Harness logout={logout} entries={[{ occurrenceId: "t1", status: "draft" }]} />);
    fireEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("warns first when videos still wait, and lets the oved stay", async () => {
    const logout = vi.fn();
    render(<Harness logout={logout} entries={[{ occurrenceId: "t1", status: "pending" }]} />);
    fireEvent.click(screen.getByText("logout"));
    expect(await screen.findByText(he.logoutPendingTitle)).toBeTruthy();
    fireEvent.click(screen.getByTestId("logout-pending-stay"));
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out anyway when the oved insists", async () => {
    const logout = vi.fn();
    render(<Harness logout={logout} entries={[{ occurrenceId: "t1", status: "pending" }]} />);
    fireEvent.click(screen.getByText("logout"));
    fireEvent.click(await screen.findByTestId("logout-pending-anyway"));
    expect(logout).toHaveBeenCalled();
  });
});
