import { appendDescriptionBlock } from "./photoAnnotation";
import { ensureTaskTitle } from "./ensureTaskTitle";
import { isGenericTaskTitle } from "./isGenericTaskTitle";
import {
  matchEmployeeIdInText,
  type VoiceEmployeeRef,
} from "./matchEmployeeFromVoice";

export interface ApplyReferenceTranscriptInput {
  transcript: string;
  currentTitle: string;
  currentDescription: string;
  currentAssigneeId: string;
  employees: VoiceEmployeeRef[];
  /** Si true : ne jamais changer l’assigné (drawer employé). */
  lockAssignee?: boolean;
}

export interface ApplyReferenceTranscriptResult {
  description: string;
  title: string;
  assignee_user_id: string;
  assigneeMatched: boolean;
}

/**
 * Après תמלול audio de référence :
 * - ajoute le texte à la description
 * - génère le titre si vide / générique
 * - assigne un oved seulement si le texte le désigne clairement
 */
export async function applyReferenceTranscript(
  input: ApplyReferenceTranscriptInput,
): Promise<ApplyReferenceTranscriptResult> {
  const transcript = (input.transcript || "").trim();
  const description = transcript
    ? appendDescriptionBlock(input.currentDescription, transcript)
    : input.currentDescription;

  const seedTitle = isGenericTaskTitle(input.currentTitle) ? "" : input.currentTitle.trim();
  const title = await ensureTaskTitle(seedTitle, description);

  let assignee_user_id = (input.currentAssigneeId || "").trim();
  let assigneeMatched = false;
  if (!input.lockAssignee && !assignee_user_id && transcript) {
    const matched = matchEmployeeIdInText(transcript, input.employees);
    if (matched) {
      assignee_user_id = matched;
      assigneeMatched = true;
    }
  }

  return { description, title, assignee_user_id, assigneeMatched };
}
