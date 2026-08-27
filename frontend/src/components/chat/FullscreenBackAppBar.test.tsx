import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "./FullscreenBackAppBar";
import { he } from "../../i18n/he";

describe("FullscreenBackAppBar", () => {
  it("shows a visible back control that closes the chat", () => {
    const onBack = vi.fn();
    render(<FullscreenBackAppBar title="המנהל" onBack={onBack} />);
    expect(screen.getByText("המנהל")).toBeTruthy();
    expect(screen.getByRole("button", { name: he.goBack })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.goBack }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the back bar pinned so the thread cannot push it off-screen", () => {
    expect(fullscreenChatDialogPaperSx.overflow).toBe("hidden");
    expect(fullscreenChatBodySx.flex).toBe(1);
    expect(fullscreenChatBodySx.minHeight).toBe(0);
  });
});
