import type { TaskVoiceFillResult } from "../components/ai/TaskVoiceAssistant";
import { ensureTaskTitle } from "./ensureTaskTitle";
import { isGenericTaskTitle } from "./isGenericTaskTitle";
import {
  matchEmployeeIdByName,
  matchEmployeeIdInText,
  type VoiceEmployeeRef,
} from "./matchEmployeeFromVoice";

export interface ResolvedVoiceFill {
  title: string;
  description: string;
  assignee_user_id: string;
}

/**
 * Applique le brouillon vocal : description, titre (pas générique),
 * et oved si nommé dans l’audio / le texte.
 */
export async function resolveVoiceFillFields(
  data: TaskVoiceFillResult,
  employees: VoiceEmployeeRef[] = [],
): Promise<ResolvedVoiceFill> {
  const description = (data.description || "").trim();
  const rawTitle = (data.title || "").trim();
  const seedTitle = isGenericTaskTitle(rawTitle) ? "" : rawTitle;
  const title = await ensureTaskTitle(seedTitle, description);

  let assigneeUserId = (data.assignee_user_id || "").trim();
  if (assigneeUserId && !employees.some((e) => e.id === assigneeUserId)) {
    // id inconnu côté client → tenter par nom
    assigneeUserId = "";
  }
  if (!assigneeUserId && data.assignee_name) {
    assigneeUserId = matchEmployeeIdByName(data.assignee_name, employees) || "";
  }
  if (!assigneeUserId) {
    assigneeUserId =
      matchEmployeeIdInText(`${title}\n${description}\n${data.assignee_name || ""}`, employees) ||
      "";
  }

  return {
    title,
    description,
    assignee_user_id: assigneeUserId,
  };
}
