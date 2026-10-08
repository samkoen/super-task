import api from "./api";
import type { WhatsAppTextKey } from "../domain/whatsappTexts";

export type WhatsAppStatus = "sent" | "simulated" | "failed";

export interface WhatsAppMessage {
  id: string;
  status: WhatsAppStatus;
  recipient_name: string;
  recipient_phone: string;
}

export interface SendWhatsAppPayload {
  textKey: WhatsAppTextKey;
  consentConfirmed: boolean;
  recipientUserId?: string;
  phone?: string;
  recipientName?: string;
}

export const whatsappService = {
  send: async (payload: SendWhatsAppPayload): Promise<WhatsAppMessage> => {
    const body: Record<string, unknown> = {
      text_key: payload.textKey,
      consent_confirmed: payload.consentConfirmed,
    };
    if (payload.recipientUserId) {
      body.recipient_user_id = payload.recipientUserId;
    } else {
      body.phone = payload.phone?.trim();
      body.recipient_name = payload.recipientName?.trim();
    }
    const response = await api.post<{ message: WhatsAppMessage }>("/whatsapp/messages", body);
    return response.data.message;
  },
};
