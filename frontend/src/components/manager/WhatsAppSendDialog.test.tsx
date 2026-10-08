import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WhatsAppSendDialog, { canSubmitWhatsApp } from "./WhatsAppSendDialog";
import { he } from "../../i18n/he";
import { ApiError, type User } from "../../services/api";
import { whatsappService } from "../../services/whatsappService";

vi.mock("../../services/whatsappService", () => ({ whatsappService: { send: vi.fn() } }));

const employee = { id: "e1", full_name: "דנה כהן", phone: "0501234567" } as User;

const sendButton = () => screen.getByRole("button", { name: he.whatsappSend });

describe("canSubmitWhatsApp", () => {
  it("requires consent", () => {
    expect(canSubmitWhatsApp({ employee, name: "", phone: "", consent: false })).toBe(false);
    expect(canSubmitWhatsApp({ employee, name: "", phone: "", consent: true })).toBe(true);
  });

  it("requires a phone on the employee", () => {
    const noPhone = { ...employee, phone: "" } as User;
    expect(canSubmitWhatsApp({ employee: noPhone, name: "", phone: "", consent: true })).toBe(false);
  });

  it("requires name and phone for an external number", () => {
    expect(canSubmitWhatsApp({ employee: null, name: "יוסי", phone: "", consent: true })).toBe(false);
    expect(canSubmitWhatsApp({ employee: null, name: "יוסי", phone: "052", consent: true })).toBe(true);
  });
});

describe("WhatsAppSendDialog", () => {
  beforeEach(() => {
    vi.mocked(whatsappService.send).mockReset();
  });

  it("sends to an employee only after consent", async () => {
    vi.mocked(whatsappService.send).mockResolvedValue({
      id: "m1", status: "simulated", recipient_name: "דנה כהן", recipient_phone: "972501234567",
    });
    const onSent = vi.fn();
    render(<WhatsAppSendDialog open employee={employee} onClose={vi.fn()} onSent={onSent} />);
    expect((sendButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(onSent).toHaveBeenCalledWith("simulated"));
    expect(whatsappService.send).toHaveBeenCalledWith({
      recipientUserId: "e1", textKey: "call_me", consentConfirmed: true,
    });
  });

  it("sends an external number with a name", async () => {
    vi.mocked(whatsappService.send).mockResolvedValue({
      id: "m2", status: "sent", recipient_name: "יוסי", recipient_phone: "972521112222",
    });
    render(<WhatsAppSendDialog open employee={null} onClose={vi.fn()} onSent={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(new RegExp(he.whatsappRecipientName)), { target: { value: "יוסי" } });
    fireEvent.change(screen.getByLabelText(new RegExp(he.whatsappPhone)), { target: { value: "0521112222" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(whatsappService.send).toHaveBeenCalled());
    expect(vi.mocked(whatsappService.send).mock.calls[0][0]).toMatchObject({
      phone: "0521112222", recipientName: "יוסי", consentConfirmed: true,
    });
  });

  it("shows the server error for an invalid number", async () => {
    vi.mocked(whatsappService.send).mockImplementation(() => Promise.reject(new ApiError("מספר וואטסאפ לא תקין", 400)));
    const onSent = vi.fn();
    render(<WhatsAppSendDialog open employee={employee} onClose={vi.fn()} onSent={onSent} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByText("מספר וואטסאפ לא תקין")).toBeTruthy());
    expect(onSent).not.toHaveBeenCalled();
  });
});
