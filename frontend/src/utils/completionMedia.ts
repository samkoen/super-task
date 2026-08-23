export type CompletionKind = "photo" | "video" | "audio";

export type CompletionRequirement = {
  kind: CompletionKind;
  min_seconds?: number;
  title?: string;
  hint?: string;
  example_url?: string;
  /** Fichier local — upload seulement à la soumission. */
  pending_example?: File | null;
};

export type CompletionAttachment = {
  kind: CompletionKind;
  url: string;
  duration_seconds?: number;
};

export const MAX_COMPLETION_REQUIREMENTS = 10;
export const DEFAULT_VIDEO_SECONDS = 10;
export const MAX_SLOT_TITLE = 80;
export const MAX_SLOT_HINT = 300;

export function normalizeMinVideoSeconds(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(600, Math.round(n));
}

function readSlotTitle(item: { title?: unknown }): string | undefined {
  if (typeof item.title !== "string") return undefined;
  const title = item.title.trim().slice(0, MAX_SLOT_TITLE);
  return title || undefined;
}

function readExampleUrl(item: { example_url?: unknown }): string | undefined {
  if (typeof item.example_url !== "string") return undefined;
  const url = item.example_url.trim();
  return url || undefined;
}

function readSlotHint(item: { hint?: unknown }): string | undefined {
  if (typeof item.hint !== "string") return undefined;
  const hint = item.hint.trim().slice(0, MAX_SLOT_HINT);
  return hint || undefined;
}

function withVisualGuide(
  item: { title?: unknown; hint?: unknown; example_url?: unknown },
): Pick<CompletionRequirement, "title" | "hint" | "example_url"> {
  const title = readSlotTitle(item);
  const hint = readSlotHint(item);
  const example_url = readExampleUrl(item);
  return {
    ...(title ? { title } : {}),
    ...(hint ? { hint } : {}),
    ...(example_url ? { example_url } : {}),
  };
}

export function normalizeRequirements(raw: unknown): CompletionRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: CompletionRequirement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const kind = (item as { kind?: string }).kind;
    if (kind !== "photo" && kind !== "video" && kind !== "audio") continue;
    if (kind === "audio") {
      out.push({ kind });
      continue;
    }
    const guide = withVisualGuide(
      item as { title?: unknown; hint?: unknown; example_url?: unknown },
    );
    if (kind !== "video") {
      out.push({ kind, ...guide });
      continue;
    }
    const min = normalizeMinVideoSeconds((item as { min_seconds?: number }).min_seconds);
    out.push({ kind: "video", min_seconds: min ?? DEFAULT_VIDEO_SECONDS, ...guide });
  }
  return out.slice(0, MAX_COMPLETION_REQUIREMENTS);
}

export function requirementsFromLegacy(
  photoRequired: boolean | undefined,
  minVideoSeconds: number | string | null | undefined,
): CompletionRequirement[] {
  const min = normalizeMinVideoSeconds(minVideoSeconds);
  if (min) return [{ kind: "video", min_seconds: min }];
  if (photoRequired) return [{ kind: "photo" }];
  return [];
}

export function effectiveRequirements(task: {
  completion_requirements?: CompletionRequirement[] | null;
  photo_required?: boolean;
  min_video_seconds?: number | null;
}): CompletionRequirement[] {
  if (Array.isArray(task.completion_requirements)) {
    return normalizeRequirements(task.completion_requirements);
  }
  const legacy = requirementsFromLegacy(task.photo_required, task.min_video_seconds);
  if (legacy.length) return legacy;
  return [{ kind: "photo" }];
}

export function addRequirement(
  list: CompletionRequirement[],
  kind: CompletionKind,
): CompletionRequirement[] {
  if (list.length >= MAX_COMPLETION_REQUIREMENTS) return list;
  if (kind === "video") {
    return [...list, { kind: "video", min_seconds: DEFAULT_VIDEO_SECONDS }];
  }
  return [...list, { kind }];
}

export function removeRequirement(list: CompletionRequirement[], index: number): CompletionRequirement[] {
  return list.filter((_, i) => i !== index);
}

export function setVideoSeconds(
  list: CompletionRequirement[],
  index: number,
  seconds: number | string,
): CompletionRequirement[] {
  const min = normalizeMinVideoSeconds(seconds) ?? DEFAULT_VIDEO_SECONDS;
  return list.map((item, i) => (i === index && item.kind === "video" ? { ...item, min_seconds: min } : item));
}

export function setRequirementTitle(
  list: CompletionRequirement[],
  index: number,
  title: string,
): CompletionRequirement[] {
  const next = title.slice(0, MAX_SLOT_TITLE);
  return list.map((item, i) =>
    i === index && item.kind !== "audio" ? { ...item, title: next } : item,
  );
}

export function setRequirementHint(
  list: CompletionRequirement[],
  index: number,
  hint: string,
): CompletionRequirement[] {
  const next = hint.slice(0, MAX_SLOT_HINT);
  return list.map((item, i) =>
    i === index && item.kind !== "audio" ? { ...item, hint: next } : item,
  );
}

export function setRequirementExample(
  list: CompletionRequirement[],
  index: number,
  example_url: string,
  pending_example: File | null,
): CompletionRequirement[] {
  return list.map((item, i) =>
    i === index && item.kind !== "audio" ? { ...item, example_url, pending_example } : item,
  );
}

export function countVisualKinds(list: CompletionRequirement[]): { photos: number; videos: number } {
  return {
    photos: list.filter((item) => item.kind === "photo").length,
    videos: list.filter((item) => item.kind === "video").length,
  };
}

export function toApiRequirement(item: CompletionRequirement): CompletionRequirement {
  const next: CompletionRequirement = { kind: item.kind };
  if (item.kind === "video") {
    next.min_seconds = item.min_seconds ?? DEFAULT_VIDEO_SECONDS;
  }
  if (item.kind === "audio") return next;
  const title = (item.title || "").trim().slice(0, MAX_SLOT_TITLE);
  if (title) next.title = title;
  const hint = (item.hint || "").trim().slice(0, MAX_SLOT_HINT);
  if (hint) next.hint = hint;
  const url = (item.example_url || "").trim();
  if (url && !url.startsWith("blob:")) next.example_url = url;
  return next;
}

export async function resolveRequirementExamples(
  list: CompletionRequirement[],
  uploadPhoto: (file: File) => Promise<{ url: string }>,
): Promise<CompletionRequirement[]> {
  const out: CompletionRequirement[] = [];
  for (const item of list) {
    const next = toApiRequirement(item);
    if (item.kind !== "audio" && item.pending_example) {
      next.example_url = (await uploadPhoto(item.pending_example)).url;
    }
    out.push(next);
  }
  return out;
}

export function meetsCompletionRequirements(
  requirements: CompletionRequirement[],
  slots: Array<{ kind: CompletionKind; durationSeconds?: number | null } | null>,
): boolean {
  if (!requirements.length) return true;
  if (slots.length < requirements.length) return false;
  return requirements.every((req, i) => {
    const slot = slots[i];
    if (!slot || slot.kind !== req.kind) return false;
    if (req.kind !== "video") return true;
    return (slot.durationSeconds ?? 0) >= (req.min_seconds ?? DEFAULT_VIDEO_SECONDS);
  });
}

export function meetsCompletionMedia(opts: {
  hasPhoto: boolean;
  hasVideo: boolean;
  videoSeconds: number | null | undefined;
  minVideoSeconds: number | null | undefined;
}): boolean {
  const min = normalizeMinVideoSeconds(opts.minVideoSeconds);
  if (min) {
    return Boolean(opts.hasVideo) && (opts.videoSeconds ?? 0) >= min;
  }
  return opts.hasPhoto || opts.hasVideo;
}
