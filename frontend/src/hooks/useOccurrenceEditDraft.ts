import { useEffect, useMemo, useState } from "react";
import { ApiError, type User } from "../services/api";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { userService } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { he } from "../i18n/he";
import { defaultApplyAdHocEditToNetwork, isNetworkAdHocOccurrence } from "../utils/adHocNetworkTasks";
import { assigneesForBranch, withSelfAssignee } from "../utils/assigneeOptions";
import { occurrenceDraftDirty } from "../utils/occurrenceEditStudio";
import {
  formFromOccurrence,
  saveOccurrenceEdit,
  type OccurrenceEditForm,
} from "../components/tasks/taskOccurrenceEditForm";
import type { TaskReferenceMediaValue } from "../components/tasks/TaskReferenceMediaEditor";

type Loaded = { task: TaskOccurrence; initial: OccurrenceEditForm; team?: User[] };

export function errorText(e: unknown): string {
  return e instanceof ApiError ? e.message : he.errorGeneric;
}

/** Charge la tâche (et l'équipe si la page ne l'a pas) : le formulaire part de la version fraîche. */
function useEditTarget(occurrenceId: string, needTeam: boolean, networkRole: boolean) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let stop = false;
    setLoaded(null);
    setError("");
    const load = async () => {
      const task = await taskService.getOccurrence(occurrenceId);
      const team = needTeam ? await userService.listTeam("employee") : undefined;
      const initial = { ...formFromOccurrence(task), apply_to_network: defaultApplyAdHocEditToNetwork(task, networkRole) };
      if (!stop) setLoaded({ task, initial, team });
    };
    load().catch((e) => { if (!stop) setError(errorText(e)); });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger seulement quand la tâche change
  }, [occurrenceId]);
  return { loaded, error };
}

/**
 * Brouillon de l'écran d'édition d'une tâche du jour : formulaire, médias, oveds proposés,
 * « יש שינויים » et enregistrement.
 */
export function useOccurrenceEditDraft(occurrenceId: string, employees: User[] | undefined) {
  const { user } = useAuth();
  const networkRole = user?.role === "network_manager" || user?.role === "admin";
  const { loaded, error } = useEditTarget(occurrenceId, !employees, networkRole);
  const [form, setForm] = useState<OccurrenceEditForm | null>(null);
  const [mediaDirty, setMediaDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm(loaded?.initial ?? null);
    setMediaDirty(false);
  }, [loaded]);

  const task = loaded?.task ?? null;
  const people = useMemo(() => {
    const staff = withSelfAssignee(employees ?? loaded?.team ?? [], user);
    return task ? assigneesForBranch(staff, task.branch_id, user?.id) : staff;
  }, [employees, loaded?.team, task, user]);

  const patch = (changes: Partial<OccurrenceEditForm>) => setForm((current) => (current ? { ...current, ...changes } : current));
  const setMedia = (media: TaskReferenceMediaValue) => {
    setMediaDirty(true);
    patch({ ...media, pending_photo: media.pending_photo ?? null, pending_video: media.pending_video ?? null });
  };
  const save = async (): Promise<string> => {
    if (!task || !form) throw new Error(he.errorGeneric);
    setSaving(true);
    try {
      return await saveOccurrenceEdit(task, form, mediaDirty);
    } finally {
      setSaving(false);
    }
  };

  const dirty = Boolean(form && loaded && occurrenceDraftDirty(form, loaded.initial, mediaDirty));
  const networkScope = Boolean(task && networkRole && isNetworkAdHocOccurrence(task));
  return { task, form, error, people, patch, setMedia, save, saving, dirty, networkScope, currentUserId: user?.id };
}

export type OccurrenceEditDraft = ReturnType<typeof useOccurrenceEditDraft>;
