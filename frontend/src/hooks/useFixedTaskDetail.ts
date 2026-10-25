import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import type { User } from "../services/api";
import { deliveryNoteService } from "../services/deliveryNoteService";
import {
  fixedTaskService,
  type FixedTaskBranch,
  type FixedTaskGroup,
} from "../services/fixedTaskService";
import { taskService } from "../services/taskService";
import { userService } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../components/tasks/TaskReferenceMediaEditor";
import { asList } from "../utils/asList";
import { withSelfAssignee } from "../utils/assigneeOptions";
import {
  deliveryNoteNeedsUpdate,
  formDeliveryNoteState,
  savedDeliveryNoteState,
} from "../utils/deliveryNoteTemplate";
import {
  branchPatchIsEmpty,
  buildBranchPatch,
  generalFormToPayload,
  type FixedBranchForm,
  type FixedGeneralForm,
} from "../utils/fixedTaskGroups";
import { resolveTaskCompletionGuides } from "../utils/resolveTaskCompletionGuides";

async function syncDeliveryNote(group: FixedTaskGroup, form: FixedGeneralForm): Promise<void> {
  const wanted = formDeliveryNoteState(form);
  if (!deliveryNoteNeedsUpdate(savedDeliveryNoteState(group), wanted)) return;
  for (const id of group.template_ids) {
    await deliveryNoteService.markTemplate(id, wanted.opened, wanted.taskType);
  }
}

/** Charge une tâche fixe (réglages généraux + snifim) et expose ses actions d'enregistrement. */
export function useFixedTaskDetail(key: string) {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const [group, setGroup] = useState<FixedTaskGroup | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const fail = useCallback(
    (e: unknown) => showError(e instanceof ApiError ? e.message : he.errorGeneric),
    [showError],
  );

  const reload = useCallback(async () => {
    setGroup(await fixedTaskService.get(key));
  }, [key]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fixedTaskService.get(key), userService.listTeam("employee")])
      .then(([g, emps]) => {
        if (!alive) return;
        setGroup(g);
        setTeam(asList<User>(emps));
        setLoadError("");
      })
      .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : he.errorGeneric))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [key]);

  const employees = useMemo(() => withSelfAssignee(team, user), [team, user]);

  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setSaving(true);
      try {
        await action();
        return true;
      } catch (e) {
        fail(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fail],
  );

  const saveGeneral = (form: FixedGeneralForm, media: TaskReferenceMediaValue) =>
    run(async () => {
      if (!group) return;
      const completion = await resolveTaskCompletionGuides(form.completion_requirements);
      const resolved = await resolveTaskReferenceMedia(media);
      await fixedTaskService.updateDefaults(key, generalFormToPayload(group, form, resolved, completion));
      await syncDeliveryNote(group, form);
      await reload();
      showSuccess(he.fixedDetailSaved);
    });

  const saveBranch = (branch: FixedTaskBranch, form: FixedBranchForm) =>
    run(async () => {
      if (!group) return;
      const patch = buildBranchPatch(branch, group, form);
      if (!branchPatchIsEmpty(patch)) await fixedTaskService.updateBranch(branch.template_id, patch);
      await reload();
      showSuccess(he.fixedBranchSaved);
    });

  const toggleBranch = (branch: FixedTaskBranch) =>
    run(async () => {
      await fixedTaskService.updateBranch(branch.template_id, {
        changes: { is_active: !branch.is_active },
      });
      await reload();
    });

  const remove = (templateId: string, allBranches: boolean) =>
    run(async () => {
      const res = await taskService.deleteTemplate(templateId, allBranches);
      showSuccess(he.managerFixedTasksDeletedNetwork(res.deleted_count ?? 1));
    });

  const linkCustomer = async (branchId: string, customerName: string): Promise<boolean> => {
    if (!customerName) return false;
    try {
      const linked = await deliveryNoteService.linkCustomer(customerName, branchId);
      const opened = linked.opened_occurrence_ids?.length ?? 0;
      showSuccess(opened ? `${he.deliveryNoteCustomerLinked} (${opened})` : he.deliveryNoteCustomerLinked);
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };

  return {
    user, group, employees, loading, loadError, saving, showError,
    reload, saveGeneral, saveBranch, toggleBranch, remove, linkCustomer,
  };
}
