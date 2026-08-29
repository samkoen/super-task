import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatAlertBanner from "./ChatAlertBanner";
import { he } from "../../i18n/he";

describe("ChatAlertBanner", () => {
  it("shows title, body and opens the task", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(
      <ChatAlertBanner
        alert={{ title: "שאלה על משימה", message: "העובד שלח הודעה" }}
        onOpen={onOpen}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("שאלה על משימה")).toBeTruthy();
    expect(screen.getByText("העובד שלח הודעה")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.openTask }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("stays closed without an alert", () => {
    render(<ChatAlertBanner alert={null} onOpen={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(he.openTask)).toBeNull();
  });
});
