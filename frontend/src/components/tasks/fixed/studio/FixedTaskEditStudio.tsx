import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, ButtonBase, TextField } from "@mui/material";
import type { User } from "../../../../services/api";
import type { FixedTaskGroup } from "../../../../services/fixedTaskService";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";
import { applyReferenceTranscript } from "../../../../utils/applyReferenceTranscript";
import { asText } from "../../../../utils/asList";
import { assigneesForBranch } from "../../../../utils/assigneeOptions";
import {
  fixedGroupImpactText,
  groupToGeneralForm,
  groupToMedia,
  type FixedGeneralForm,
} from "../../../../utils/fixedTaskGroups";
import { startUrlFieldError } from "../../../../utils/startUrl";
import { sameDraft } from "../../../../utils/studioRequirements";
import CustomerLinkRow from "../../CustomerLinkRow";
import type { TaskReferenceMediaValue } from "../../TaskReferenceMediaEditor";
import { scheduleLine } from "./FixedTaskCreateStudio";
import StudioAssigneePicker from "./StudioAssignee";
import StudioCardStack from "./StudioCardStack";
import StudioHeader from "./StudioHeader";
import StudioMoreSheet from "./StudioMoreSheet";
import StudioPreview from "./StudioPreview";
import StudioSchedule from "./StudioSchedule";
import { StudioGroupTitle, StudioLeaveDialog, StudioSaveBar, StudioScreen, StudioSection } from "./StudioScreen";
import { studioFieldSx } from "./studioUi";

export type EditTabId = "general" | "branches";

export type FixedTaskEditStudioProps = {
  group: FixedTaskGroup;
  employees: User[];
  currentUserId?: string;
  saving: boolean;
  /** Onglets permis (voir `availableTabs`) ; « general » absent = réglages en lecture seule. */
  tabs: EditTabId[];
  /** Contenu de l'onglet « סניפים » (liste des snifim d'une tâche réseau). */
  branchesView?: ReactNode;
  onSave: (form: FixedGeneralForm, media: TaskReferenceMediaValue) => Promise<boolean>;
  onDelete: () => void;
  onBack: () => void;
  onError: (message: string) => void;
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
};

function validate(group: FixedTaskGroup, form: FixedGeneralForm): string {
  if (!group.is_network && !form.assignee_user_id.trim()) return he.newTaskAssigneeRequired;
  return startUrlFieldError(form.start_url) || "";
}

async function transcriptPatch(form: FixedGeneralForm, transcript: string, employees: User[]): Promise<Partial<FixedGeneralForm>> {
  try {
    const applied = await applyReferenceTranscript({
      transcript,
      currentTitle: form.title,
      currentDescription: form.description,
      currentAssigneeId: form.assignee_user_id,
      employees: employees.map((u) => ({ id: u.id, full_name: u.full_name })),
      lockAssignee: true,
    });
    return { title: applied.title, description: applied.description };
  } catch {
    return {};
  }
}

/** Onglets en pastilles (« הגדרות כלליות » / « סניפים »), dans le style des boutons du FLOW. */
function StudioTabs({ tabs, active, onChange }: { tabs: EditTabId[]; active: EditTabId; onChange: (tab: EditTabId) => void }) {
  const labels: Record<EditTabId, string> = { general: he.fixedDetailTabGeneral, branches: he.fixedDetailTabBranches };
  return (
    <Box role="tablist" sx={{ display: "flex", gap: "4px", p: "4px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral0 }}>
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <ButtonBase
            key={tab}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            sx={{
              flex: 1,
              height: 44,
              borderRadius: `${flowRadius.full}px`,
              bgcolor: selected ? flowColor.neutral900 : "transparent",
              color: selected ? flowColor.neutral0 : flowColor.neutral900,
              ...flowText.button,
            }}
          >
            {labels[tab]}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Brouillon des réglages généraux, remis à zéro quand le serveur renvoie la tâche (après enregistrement). */
function useGeneralDraft(group: FixedTaskGroup) {
  const initial = useMemo(() => ({ form: groupToGeneralForm(group), media: groupToMedia(group) }), [group]);
  const [form, setForm] = useState<FixedGeneralForm>(initial.form);
  const [media, setMedia] = useState<TaskReferenceMediaValue>(initial.media);
  useEffect(() => {
    setForm(initial.form);
    setMedia(initial.media);
  }, [initial]);
  const dirty = !sameDraft({ form, media }, initial);
  const patch = (changes: Partial<FixedGeneralForm>) => setForm((current) => ({ ...current, ...changes }));
  return { form, media, setMedia, patch, dirty };
}

type Draft = ReturnType<typeof useGeneralDraft>;

function GeneralBody({ props, draft }: { props: FixedTaskEditStudioProps; draft: Draft }) {
  const { group, saving } = props;
  const { form, patch } = draft;
  return (
    <>
      <StudioGroupTitle title={he.studioStepsTitle} hint={group.is_network ? he.fixedDetailGeneralHint : he.studioStepsHint} />
      <StudioCardStack
        value={form.completion_requirements}
        onChange={(completion_requirements) => patch({ completion_requirements })}
        disabled={saving}
      />
      <StudioSection title={he.studioDetailsTitle}>
        <TextField
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder={he.studioDescriptionPlaceholder}
          inputProps={{ "aria-label": he.description }}
          multiline
          minRows={3}
          fullWidth
          disabled={saving}
          sx={studioFieldSx}
        />
      </StudioSection>
      <StudioSection title={he.studioWhenTitle} testId="studio-when">
        <StudioSchedule
          value={{
            recurrence: group.recurrence,
            dueTime: form.due_time,
            weeklyDays: form.weekly_days,
            monthlyDay: group.monthly_day ?? 1,
          }}
          onChange={(changes) =>
            patch({
              ...(changes.dueTime !== undefined ? { due_time: changes.dueTime } : {}),
              ...(changes.weeklyDays !== undefined ? { weekly_days: changes.weeklyDays } : {}),
            })
          }
          recurrenceLocked
          disabled={saving}
        />
      </StudioSection>
      {group.is_network ? null : (
        <StudioSection title={he.studioWhoTitle} testId="studio-who">
          <StudioAssigneePicker
            employees={assigneesForBranch(props.employees, group.branches[0]?.branch_id, props.currentUserId)}
            value={form.assignee_user_id}
            onChange={(assignee_user_id) => patch({ assignee_user_id })}
            currentUserId={props.currentUserId}
            disabled={saving}
          />
        </StudioSection>
      )}
    </>
  );
}

function MoreSheet({ props, draft, open, onClose }: { props: FixedTaskEditStudioProps; draft: Draft; open: boolean; onClose: () => void }) {
  const { group, saving } = props;
  const { form, patch } = draft;
  return (
    <StudioMoreSheet
      open={open}
      onClose={onClose}
      disabled={saving}
      media={draft.media}
      onMediaChange={draft.setMedia}
      onTranscript={(t) => void transcriptPatch(form, t, props.employees).then(patch)}
      onError={props.onError}
      advanced={{ startUrl: form.start_url, opsCategory: form.ops_category, isWorkStart: form.is_work_start, isWorkEnd: form.is_work_end }}
      onAdvancedChange={(p) =>
        patch({
          ...(p.startUrl !== undefined ? { start_url: p.startUrl } : {}),
          ...(p.opsCategory !== undefined ? { ops_category: p.opsCategory } : {}),
          ...(p.isWorkStart !== undefined ? { is_work_start: p.isWorkStart } : {}),
          ...(p.isWorkEnd !== undefined ? { is_work_end: p.isWorkEnd } : {}),
        })
      }
      delivery={{ enabled: form.opened_by_delivery_note, taskType: form.delivery_note_task_type }}
      onDeliveryChange={(p) =>
        patch({
          ...(p.enabled !== undefined ? { opened_by_delivery_note: p.enabled } : {}),
          ...(p.taskType !== undefined ? { delivery_note_task_type: p.taskType } : {}),
        })
      }
      deliveryExtra={props.onLinkCustomer && !group.is_network ? <CustomerLinkRow onLink={props.onLinkCustomer} /> : null}
      active={{ value: form.is_active, onChange: (is_active) => patch({ is_active }) }}
      remove={{
        label: group.is_network ? he.fixedDetailDeleteNetwork : he.managerFixedTasksDelete,
        onClick: () => {
          onClose();
          props.onDelete();
        },
      }}
    />
  );
}

function previewPerson(props: FixedTaskEditStudioProps, form: FixedGeneralForm): { name?: string; photo?: string | null } {
  const id = props.group.is_network ? props.group.branches[0]?.assignee_user_id : form.assignee_user_id;
  const user = props.employees.find((u) => u.id === id);
  return { name: user?.full_name ?? asText(props.group.branches[0]?.assignee_name), photo: user?.avatar_url };
}

/**
 * Édition d'une tâche fixe dans le style du FLOW 1 : mêmes cartes que l'oved, réglages en blocs,
 * barre « שמירת שינויים » qui n'apparaît que s'il y a quelque chose à enregistrer.
 */
export default function FixedTaskEditStudio(props: FixedTaskEditStudioProps) {
  const { group, saving, tabs } = props;
  const canEdit = tabs.includes("general");
  const draft = useGeneralDraft(group);
  const [tab, setTab] = useState<EditTabId>(tabs[0] ?? "general");
  const [moreOpen, setMoreOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const { form } = draft;
  const person = previewPerson(props, form);

  const save = () => {
    const error = validate(group, form);
    if (error) props.onError(error);
    else void props.onSave(form, draft.media);
  };
  const back = () => (canEdit && draft.dirty ? setLeaving(true) : props.onBack());

  const header = (
    <StudioHeader
      kicker={he.studioKickerEdit}
      title={canEdit ? form.title : asText(group.title)}
      onTitleChange={canEdit ? (title) => draft.patch({ title }) : undefined}
      scheduleLine={scheduleLine(form.due_time, group.recurrence)}
      onBack={back}
      onPreview={() => setPreviewOpen(true)}
      onMore={canEdit ? () => setMoreOpen(true) : undefined}
      disabled={saving}
    />
  );
  const footer =
    canEdit && draft.dirty && activeTab === "general" ? (
      <StudioSaveBar
        label={he.studioSave}
        onSave={save}
        saving={saving}
        note={group.is_network ? fixedGroupImpactText(group) : he.studioUnsaved}
        noteTestId={group.is_network ? "fixed-impact" : "studio-unsaved"}
      />
    ) : null;

  return (
    <StudioScreen header={header} footer={footer} onBack={back}>
      {tabs.length > 1 ? <StudioTabs tabs={tabs} active={activeTab} onChange={setTab} /> : null}
      {activeTab === "general" ? <GeneralBody props={props} draft={draft} /> : props.branchesView}
      {canEdit ? <MoreSheet props={props} draft={draft} open={moreOpen} onClose={() => setMoreOpen(false)} /> : null}
      <StudioPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={canEdit ? form.title : asText(group.title)}
        dueTime={form.due_time}
        requirements={form.completion_requirements}
        employeeName={person.name}
        photoUrl={person.photo}
      />
      <StudioLeaveDialog open={leaving} onStay={() => setLeaving(false)} onLeave={props.onBack} />
    </StudioScreen>
  );
}
