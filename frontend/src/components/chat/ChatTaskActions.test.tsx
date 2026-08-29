import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatTaskActions from "./ChatTaskActions";
import { he } from "../../i18n/he";

describe("ChatTaskActions", () => {
  it("lets the manager complete or set a reminder without auto-closing on view", () => {
    const onComplete = vi.fn();
    const onRemind = vi.fn();
    render(<ChatTaskActions disabled={false} onComplete={onComplete} onRemind={onRemind} />);
    fireEvent.click(screen.getByRole("button", { name: he.chatTaskComplete }));
    fireEvent.click(screen.getByRole("button", { name: he.chatTaskReminder }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onRemind).toHaveBeenCalledTimes(1);
  });
});
