import { he } from "../i18n/he";
import { formatDurationMinutes } from "./dashboardTime";

export type RecipientBreakPayload = {
  on_break: boolean;
  on_break_since: string;
  elapsed_seconds: number;
};

export type BreakAlertTarget = {
  userId: string;
  alert: RecipientBreakPayload;
};

export function parseRecipientBreak(data: unknown): BreakAlertTarget | null {
  if (!data || typeof data !== "object") return null;
  const row = data as {
    recipient_user_id?: unknown;
    recipient_break?: Partial<RecipientBreakPayload> | null;
  };
  const userId = typeof row.recipient_user_id === "string" ? row.recipient_user_id.trim() : "";
  const alert = row.recipient_break;
  if (!userId || !alert?.on_break || !alert.on_break_since) return null;
  return {
    userId,
    alert: {
      on_break: true,
      on_break_since: alert.on_break_since,
      elapsed_seconds: Number(alert.elapsed_seconds) || 0,
    },
  };
}

export function formatBreakElapsed(elapsedSeconds: number): string {
  const minutes = Math.floor(Math.max(0, elapsedSeconds) / 60);
  if (minutes < 1) return he.breakAlertLessThanMinute;
  return formatDurationMinutes(minutes);
}
