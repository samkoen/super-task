import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./api";
import { whatsappService } from "./whatsappService";

vi.mock("./api", () => ({ default: { post: vi.fn() } }));

describe("whatsappService.send", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("sends only the user id and consent for an employee", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: { id: "1", status: "sent" } } });
    const msg = await whatsappService.send({
      recipientUserId: "e1",
      textKey: "call_me",
      consentConfirmed: true,
      phone: "050",
    });
    expect(api.post).toHaveBeenCalledWith("/whatsapp/messages", {
      recipient_user_id: "e1",
      text_key: "call_me",
      consent_confirmed: true,
    });
    expect(msg.status).toBe("sent");
  });

  it("sends trimmed phone and name for an external number", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: { id: "2", status: "simulated" } } });
    await whatsappService.send({
      phone: " 0501234567 ",
      recipientName: " יוסי ",
      textKey: "open_app",
      consentConfirmed: true,
    });
    expect(api.post).toHaveBeenCalledWith("/whatsapp/messages", {
      phone: "0501234567",
      recipient_name: "יוסי",
      text_key: "open_app",
      consent_confirmed: true,
    });
  });

  it("propagates API errors", async () => {
    vi.mocked(api.post).mockImplementation(() => Promise.reject(new Error("מספר וואטסאפ לא תקין")));
    await expect(
      whatsappService.send({ phone: "1", recipientName: "x", textKey: "call_me", consentConfirmed: true }),
    ).rejects.toThrow("מספר וואטסאפ לא תקין");
  });
});
