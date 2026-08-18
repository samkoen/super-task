export type CompletionKind = "photo" | "video" | "audio";

export type CompletionRequirement = {
  kind: CompletionKind;
  min_seconds?: number;
};

export type CompletionAttachment = {
  kind: CompletionKind;
  url: string;
  duration_seconds?: number;
};

export const MAX_COMPLETION_REQUIREMENTS = 10;
export const DEFAULT_VIDEO_SECONDS = 10;

export function normalizeMinVideoSeconds(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(600, Math.round(n));
}

export function normalizeRequirements(raw: unknown): CompletionRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: CompletionRequirement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const kind = (item as { kind?: string }).kind;
    if (kind !== "photo" && kind !== "video" && kind !== "audio") continue;
    if (kind !== "video") {
      out.push({ kind });
      continue;
    }
    const min = normalizeMinVideoSeconds((item as { min_seconds?: number }).min_seconds);
    out.push({ kind: "video", min_seconds: min ?? DEFAULT_VIDEO_SECONDS });
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
