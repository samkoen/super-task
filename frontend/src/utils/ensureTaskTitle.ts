import { aiService } from "../services/aiService";

/** Titre saisi, sinon génération IA depuis la description (repli = début description). */
export async function ensureTaskTitle(
  title: string,
  description: string,
): Promise<string> {
  const cleanedTitle = title.trim();
  if (cleanedTitle) return cleanedTitle;
  const cleanedDescription = description.trim();
  if (!cleanedDescription) {
    throw new Error("TITLE_OR_DESCRIPTION_REQUIRED");
  }
  try {
    const { title: generated } = await aiService.generateTaskTitle(cleanedDescription);
    const out = (generated || "").trim();
    if (out) return out;
  } catch {
    // fallback below
  }
  const firstLine = cleanedDescription.split(/\r?\n/)[0]?.trim() || cleanedDescription;
  return firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;
}
