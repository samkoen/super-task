import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatFollowUpDialog from "./ChatFollowUpDialog";
import { he } from "../../i18n/he";

function renderDialog(props: Partial<React.ComponentProps<typeof ChatFollowUpDialog>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<ChatFollowUpDialog open saving={false} onClose={onClose} onSave={onSave} {...props} />);
  return { onSave, onClose };
}

describe("ChatFollowUpDialog", () => {
  it("keeps save disabled until a time is chosen", () => {
    renderDialog();
    expect((screen.getByRole("button", { name: he.chatTaskReminderSave }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("follow-up-preview")).toBeNull();
  });

  it("saves a quick preset in one tap and shows the chosen date", () => {
    const { onSave } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: he.followUpTomorrow }));
    expect(screen.getByTestId("follow-up-preview").textContent).toContain("09:00");
    fireEvent.click(screen.getByRole("button", { name: he.chatTaskReminderSave }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(typeof onSave.mock.calls[0][0]).toBe("string");
  });

  it("offers the three quick choices", () => {
    renderDialog();
    for (const name of [he.followUpInHour, he.followUpTomorrow, he.followUpNextWeek]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("cannot be closed or saved while saving", () => {
    renderDialog({ saving: true, initialIso: "2030-01-01T09:00:00Z" });
    expect((screen.getByRole("button", { name: he.close }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: he.chatTaskReminderSave }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("closes from cancel", () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
