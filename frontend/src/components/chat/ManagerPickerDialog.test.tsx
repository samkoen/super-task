import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerPickerDialog from "./ManagerPickerDialog";
import { he } from "../../i18n/he";
import type { DirectChatCard } from "../../services/directChatService";

const card = (id: string, scope: "branch" | "network", unread = 0): DirectChatCard => ({
  id: `c-${id}`,
  kind: "up",
  counterpart_user_id: id,
  counterpart_name: id,
  counterpart_role: "branch_manager",
  last_preview: null,
  last_at: null,
  unread_count: unread,
  scope,
});

describe("ManagerPickerDialog", () => {
  it("lists each manager by role and returns the one that was tapped", () => {
    const onPick = vi.fn();
    const managers = [card("m1", "branch", 2), card("m2", "network")];
    render(<ManagerPickerDialog open managers={managers} onPick={onPick} onClose={vi.fn()} />);
    expect(screen.getByText(he.chatPickManager)).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    fireEvent.click(screen.getByText(he.roleNetworkManager));
    expect(onPick).toHaveBeenCalledWith(managers[1]);
  });

  it("shows no unread badge when there is nothing new", () => {
    render(
      <ManagerPickerDialog open managers={[card("m1", "branch")]} onPick={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("closes from the X button", () => {
    const onClose = vi.fn();
    render(<ManagerPickerDialog open managers={[card("m1", "branch")]} onPick={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
