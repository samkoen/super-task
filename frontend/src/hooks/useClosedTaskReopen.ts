import { useState } from "react";
import { ApiError } from "../services/api";
import { taskService } from "../services/taskService";
import { he } from "../i18n/he";

/**
 * « פתח מחדש » sur une tâche déjà acceptée : la feuille demande quoi corriger,
 * puis la tâche repart chez l'oved (remarque par défaut si le menahel n'écrit rien).
 */
export function useClosedTaskReopen(taskId: string, onDone: (message?: string) => void) {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const send = async (note: string) => {
    setAsking(false);
    setSaving(true);
    setError("");
    try {
      await taskService.reopenClosed(taskId, { rejection_note: note.trim() || he.taskReopenNoteFallback });
      onDone(he.taskReopenedSuccess);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return {
    asking,
    saving,
    error,
    ask: () => setAsking(true),
    cancel: () => setAsking(false),
    send: (note: string) => void send(note),
  };
}
