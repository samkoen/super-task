import { he } from "../i18n/he";

/** Texte affichable — CapacitorHttp / FastAPI envoient parfois un objet, pas une string. */

export function isRequestEntityTooLarge(text: string): boolean {
  return /request entity too large|payload too large/i.test(text);
}

export function isFetchScopeShutdown(text: string): boolean {
  return /global scope is shutting down/i.test(text);
}

export function isFailedToFetch(text: string): boolean {
  return /failed to fetch|network error/i.test(text);
}

export function isRequestTimeoutText(text: string): boolean {
  return /timeout of \d+ms exceeded|etimedout|econnaborted/i.test(text);
}

export function isFetchInterruptedText(text: string): boolean {
  return isFetchScopeShutdown(text) || isFailedToFetch(text);
}

export function isFetchInterruptedError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return isFetchInterruptedText(text);
}

const OBJECT_STRING = "[object Object]";
const HTML_DOCUMENT = /<!doctype\s+html|<html[\s>]|<\/html>/i;
const HTML_TOO_LARGE = /request entity too large|payload too large|function_payload_too_large|\b413\b/i;

/** Page HTML brute (erreur d'hébergeur), pas un message à montrer. */
export function isHtmlErrorDocument(text: string): boolean {
  return HTML_DOCUMENT.test(text);
}

function readableErrorText(text: string): string {
  if (isRequestEntityTooLarge(text) || (isHtmlErrorDocument(text) && HTML_TOO_LARGE.test(text))) {
    return he.errorRequestTooLarge;
  }
  if (isRequestTimeoutText(text)) return he.errorServerUnreachable;
  if (isFetchInterruptedText(text)) return he.errorFetchInterrupted;
  if (isHtmlErrorDocument(text)) return he.errorGeneric;
  return text;
}

export function humanizeApiError(payload: unknown, depth = 0): string {
  if (depth > 5 || payload == null) return "";
  if (typeof payload === "string") {
    const text = payload.trim();
    if (!text || text === OBJECT_STRING) return "";
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        return humanizeApiError(JSON.parse(text), depth + 1) || readableErrorText(text);
      } catch {
        return readableErrorText(text);
      }
    }
    return readableErrorText(text);
  }
  if (typeof payload === "number" || typeof payload === "boolean") return String(payload);
  if (Array.isArray(payload)) {
    return payload.map((item) => formatDetailItem(item)).filter(Boolean).join(" | ");
  }
  if (typeof payload !== "object") return "";
  const row = payload as Record<string, unknown>;
  return (
    humanizeApiError(row.error, depth + 1) ||
    humanizeApiError(row.detail, depth + 1) ||
    humanizeApiError(row.message, depth + 1) ||
    humanizeApiError(row.msg, depth + 1) ||
    humanizeApiError(row.data, depth + 1)
  );
}

function formatDetailItem(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  const row = item as { msg?: string; message?: string; loc?: unknown[] };
  const message = (row.msg || row.message || "").trim();
  const field = Array.isArray(row.loc) ? row.loc.filter((x) => x !== "body").join(".") : "";
  return field && message ? `${field}: ${message}` : message;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const fromMessage = humanizeApiError((error as { message: unknown }).message);
    if (fromMessage) return fromMessage;
  }
  return humanizeApiError(error) || fallback;
}
