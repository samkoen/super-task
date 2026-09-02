export function chatBubbleSx(opts: {
  mine: boolean;
  audioOnly?: boolean;
  fromEmployee?: boolean;
}) {
  return {
    alignSelf: opts.audioOnly ? "stretch" : opts.mine ? "flex-end" : "flex-start",
    width: opts.audioOnly ? "100%" : "auto",
    maxWidth: opts.audioOnly ? "100%" : "90%",
    px: 1.25,
    py: opts.audioOnly ? 0.5 : 1.25,
    borderRadius: 2,
    bgcolor: opts.mine ? "primary.main" : opts.fromEmployee ? "#fff8e1" : "background.paper",
    color: opts.mine ? "primary.contrastText" : "text.primary",
    border: opts.mine ? "none" : "1px solid",
    borderColor: opts.fromEmployee ? "warning.light" : "divider",
    boxShadow: opts.fromEmployee && !opts.mine ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
  } as const;
}

export const chatBubbleCopySx = {
  color: "inherit",
  whiteSpace: "pre-wrap",
} as const;

export const chatBubbleMetaSx = {
  color: "inherit",
  opacity: 0.92,
} as const;

export function isChatAudioOnly(opts: {
  text?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}): boolean {
  return Boolean(opts.audioUrl) && !opts.text && !opts.photoUrl && !opts.videoUrl;
}
