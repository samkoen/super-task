export const DELIVERY_TASK_LINE_CHECK = "line_check";
export const DELIVERY_TASK_ORIGIN = "origin_list";
export const DELIVERY_TASK_TYPES = [DELIVERY_TASK_LINE_CHECK, DELIVERY_TASK_ORIGIN] as const;

export type DeliveryLineStatus = "ok" | "problem";
export type DeliveryOverall = "accepted" | "problem";

export type DeliveryLineDraft = {
  arrival: DeliveryLineStatus | "";
  note: string;
  photo_url: string;
};

export type DeliveryLineView = {
  id: string;
  position: number;
  product_name: string;
  quantity: number;
  unit: string;
  origin_name?: string | null;
  weight?: number | null;
  price?: number | null;
  image_url?: string | null;
  answer?: {
    arrival?: DeliveryLineStatus | null;
    note?: string | null;
    photo_url?: string | null;
    fully_ok?: boolean;
  } | null;
};

export type DeliveryCheck = {
  agroline_number: string;
  document_date: string;
  kind: "fresh" | "mixed";
  pdf_url?: string | null;
  customer_name: string;
  overall_status?: DeliveryOverall | null;
  suggested_overall?: DeliveryOverall | null;
  task_type?: string | null;
  lines: DeliveryLineView[];
};

const STATUSES = new Set<DeliveryLineStatus>(["ok", "problem"]);

export function emptyLineDraft(): DeliveryLineDraft {
  return { arrival: "", note: "", photo_url: "" };
}

export function draftFromLine(line: DeliveryLineView): DeliveryLineDraft {
  const answer = line.answer;
  if (!answer?.arrival || !STATUSES.has(answer.arrival)) return emptyLineDraft();
  return {
    arrival: answer.arrival,
    note: answer.note ?? "",
    photo_url: answer.photo_url ?? "",
  };
}

export function lineFullyOk(draft: DeliveryLineDraft): boolean {
  return draft.arrival !== "problem";
}

export function lineNoteMissing(draft: DeliveryLineDraft): boolean {
  return draft.arrival === "problem" && !draft.note.trim();
}

export function canSaveDeliveryLines(drafts: DeliveryLineDraft[]): boolean {
  return drafts.every((draft) => !lineNoteMissing(draft));
}

export function lineCheckCounts(drafts: DeliveryLineDraft[]): { ok: number; problem: number } {
  const problem = drafts.filter((draft) => draft.arrival === "problem").length;
  return { ok: drafts.length - problem, problem };
}

export function showProblemFields(draft: DeliveryLineDraft): boolean {
  return draft.arrival === "problem";
}

export function suggestOverall(rows: Array<{ fully_ok: boolean }>): DeliveryOverall {
  return rows.every((row) => row.fully_ok) ? "accepted" : "problem";
}

export function linesWithOrigin<T extends { origin_name?: string | null }>(lines: T[]): T[] {
  return lines.filter((line) => Boolean(line.origin_name?.trim()));
}

export function lineProductLabel(line: Pick<DeliveryLineView, "product_name" | "origin_name">): string {
  const origin = line.origin_name?.trim();
  return origin ? `${line.product_name} · ${origin}` : line.product_name;
}

export function lineAmount(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value).toFixed(2);
}

export function lineMeasures(
  line: Pick<DeliveryLineView, "weight" | "price">,
  labels: { weight: string; price: string },
): string | null {
  const parts: string[] = [];
  const weight = lineAmount(line.weight);
  const price = lineAmount(line.price);
  if (weight) parts.push(`${labels.weight} ${weight}`);
  if (price) parts.push(`${labels.price} ${price}`);
  return parts.length ? parts.join(" · ") : null;
}

export function lineFacts(
  line: Pick<DeliveryLineView, "quantity" | "unit" | "weight" | "price">,
  labels: { weight: string; price: string },
): string {
  const parts = [`${line.quantity} ${line.unit}`];
  const weight = lineAmount(line.weight);
  const price = lineAmount(line.price);
  if (weight) parts.push(`${labels.weight} ${weight}`);
  if (price) parts.push(`${labels.price} ${price}`);
  return parts.join(" · ");
}

export function draftToPayload(lineId: string, draft: DeliveryLineDraft) {
  const problem = draft.arrival === "problem";
  return {
    line_id: lineId,
    arrival: problem ? "problem" : "ok",
    note: problem ? draft.note.trim() || null : null,
    photo_url: problem ? draft.photo_url || null : null,
  };
}
