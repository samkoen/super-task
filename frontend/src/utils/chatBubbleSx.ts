export function chatBubbleSx(opts: {
  mine: boolean;
  audioOnly?: boolean;
  fromEmployee?: boolean;
}) {
  return {
    alignSelf: opts.audioOnly ? "stretch" : opts.mine ? "flex-end" : "flex-start",
    width: opts.audioOnly ? "100%" : "auto",
    maxWidth: opts.audioOnly ? "100%" : "88%",
    px: 1.75,
    py: opts.audioOnly ? 0.75 : 1.25,
    borderRadius: "18px",
    // Petite « queue » du côté de l'expéditeur, comme dans une vraie messagerie.
    ...(opts.audioOnly ? {} : opts.mine ? { borderEndEndRadius: "4px" } : { borderEndStartRadius: "4px" }),
    bgcolor: opts.mine ? "primary.main" : opts.fromEmployee ? "#fff8e1" : "background.paper",
    color: opts.mine ? "primary.contrastText" : "text.primary",
    border: opts.mine ? "none" : "1px solid",
    borderColor: opts.fromEmployee ? "warning.light" : "divider",
    boxShadow: opts.mine ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
  } as const;
}

/** Texte d'un message : plus grand que le défaut, lisible d'un coup d'œil. */
export const chatBubbleCopySx = {
  color: "inherit",
  whiteSpace: "pre-wrap",
  fontSize: "1.05rem",
  lineHeight: 1.55,
  overflowWrap: "anywhere",
} as const;

export const chatBubbleMetaSx = {
  color: "inherit",
  opacity: 0.85,
  fontWeight: 700,
  mb: 0.25,
} as const;

export function isChatAudioOnly(opts: {
  text?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}): boolean {
  return Boolean(opts.audioUrl) && !opts.text && !opts.photoUrl && !opts.videoUrl;
}
