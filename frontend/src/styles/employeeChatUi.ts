/**
 * Jetons de l'écran « צ׳אט כללי · עובד » (Figma Super-Man app, section 538:2911).
 * Les couleurs génériques viennent de flowTokens ; ici seulement ce qui est propre à la liste.
 */
import type { ChatStatusKind, ChatVisualKind } from "../services/taskService";
import { FLOW_FONT, flowColor } from "./flowTokens";

export const chatUi = {
  font: FLOW_FONT,
  textPrimary: flowColor.textPrimary,
  textSecondary: flowColor.textSecondary,
  textWarning: "#c2530a",
  pendingFg: "#8a6306",
  borderSubtle: "rgba(26,26,26,0.18)",
  chipFg: flowColor.alphaNeutral900_66,
  chipActiveBg: flowColor.alphaOrange500_20,
  chipActiveBorder: "rgba(255,137,74,0.43)",
  chipActiveFg: "#a95020",
  searchBg: flowColor.neutral100,
  accent: flowColor.orange500,
  generalAvatarBg: flowColor.neutral900,
  handle: flowColor.neutral300,
  avatar: 52,
  rowGap: 12,
  /** FAB 56×56, 24 du bord, 16 au-dessus du Bottom Nav. */
  fab: 56,
  fabRadius: 16,
} as const;

/** Task Avatar : fond pastel + icône dans la couleur du type. */
export const chatVisualColors: Record<ChatVisualKind, { bg: string; fg: string }> = {
  video: { bg: "#fde9dc", fg: "#f7701e" },
  photo: { bg: "#e4f2e5", fg: "#2e854d" },
  physical: { bg: "#fff3d4", fg: "#c48a00" },
  check: { bg: "#e8ecef", fg: "#11151d" },
  cleaning: { bg: "#e4eaf1", fg: "#3a5a85" },
};

export const chatStatusColor: Record<ChatStatusKind, string> = {
  retake: chatUi.textWarning,
  pending_review: chatUi.pendingFg,
  awaiting_upload: chatUi.textSecondary,
  approved: flowColor.statusSuccessFg,
};
