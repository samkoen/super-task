export const WHATSAPP_TEXT_KEYS = ["call_me", "open_app", "come_to_branch"] as const;

export type WhatsAppTextKey = (typeof WHATSAPP_TEXT_KEYS)[number];
