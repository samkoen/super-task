/** Titres génériques (type de tâche) — à remplacer par un titre issu de la description. */
const GENERIC_TITLES = new Set(
  [
    "משימה מזדמנת",
    "משימה קבועה",
    "משימה מזדמנת (חד-פעמית)",
    "משימה קבועה (חוזרת)",
    "משימה חדשה",
    "ad hoc",
    "ad-hoc",
    "fixed task",
    "new task",
  ].map((s) => s.trim().toLowerCase()),
);

export function isGenericTaskTitle(title: string | null | undefined): boolean {
  const cleaned = (title || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!cleaned) return true;
  if (GENERIC_TITLES.has(cleaned)) return true;
  // "משימה מזדמנת — …" / variantes courtes
  if (/^משימה\s+(מזדמנת|קבועה)\b/.test(cleaned) && cleaned.length <= 24) {
    return true;
  }
  return false;
}
