import { useState } from "react";
import { Alert, Box, ButtonBase, CircularProgress, Switch, TextField, Typography } from "@mui/material";
import type { User } from "../../../services/api";
import type { TaskOccurrence } from "../../../services/taskService";
import { useFeedback } from "../../../context/FeedbackContext";
import { useOccurrenceEditDraft, errorText, type OccurrenceEditDraft } from "../../../hooks/useOccurrenceEditDraft";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import { appendDescriptionBlock } from "../../../utils/photoAnnotation";
import { isManagerNextTask } from "../../../utils/employeeTaskFocus";
import { canMarkManagerNext, occurrenceEditBlocker } from "../../../utils/occurrenceEditStudio";
import { onceScheduleLine, splitDueAt } from "../../../utils/studioOnce";
import CompletionMediaPreview from "../CompletionMediaPreview";
import TaskChatDialog from "../TaskChatDialog";
import StudioAssigneePicker from "../fixed/studio/StudioAssignee";
import StudioCardStack from "../fixed/studio/StudioCardStack";
import StudioHeader from "../fixed/studio/StudioHeader";
import StudioMoreSheet from "../fixed/studio/StudioMoreSheet";
import StudioPreview from "../fixed/studio/StudioPreview";
import StudioSchedule from "../fixed/studio/StudioSchedule";
import { StudioGroupTitle, StudioLeaveDialog, StudioSaveBar, StudioScreen, StudioSection } from "../fixed/studio/StudioScreen";
import { studioFieldSx, studioSecondarySx } from "../fixed/studio/studioUi";

export type ManagerTaskEditScreenProps = {
  occurrenceId: string | null;
  /** Évite un chargement de l'équipe quand la page l'a déjà. */
  employees?: User[];
  /** Ligne de la liste : « המשימה הבאה » y est à jour juste après un changement. */
  listTask?: TaskOccurrence;
  onClose: () => void;
  onSaved: (message?: string) => void;
  /** Absent : pas de « המשימה הבאה » ni de suppression (lecture sans droits de gestion). */
  onSetManagerNext?: (task: TaskOccurrence, enabled: boolean) => void;
  onDelete?: (task: TaskOccurrence) => void;
};

type Ready = { draft: OccurrenceEditDraft; task: TaskOccurrence; form: NonNullable<OccurrenceEditDraft["form"]> };
type Props = ManagerTaskEditScreenProps;

/** Ce que l'oved a déjà envoyé d'une tâche commencée (sous-tâches partielles). */
function SentSoFar({ task }: { task: TaskOccurrence }) {
  const completion = task.completion;
  if (!completion) return null;
  return (
    <StudioSection title={he.studioSentSoFar} testId="studio-sent-so-far">
      <CompletionMediaPreview
        photo_path={completion.photo_path}
        video_path={completion.video_path}
        audio_path={completion.audio_path}
        attachments={completion.completion_attachments}
        requirements={task.completion_requirements}
        audio_transcript={completion.audio_transcript}
      />
    </StudioSection>
  );
}

function WhatSections({ draft, form }: Ready) {
  return (
    <>
      <StudioGroupTitle title={he.studioStepsTitle} hint={he.studioStepsHint} />
      <StudioCardStack value={form.completion_requirements} onChange={(completion_requirements) => draft.patch({ completion_requirements })} disabled={draft.saving} />
      <StudioSection title={he.studioDetailsTitle}>
        <TextField
          value={form.description}
          onChange={(e) => draft.patch({ description: e.target.value })}
          placeholder={he.studioDescriptionPlaceholder}
          inputProps={{ "aria-label": he.description }}
          multiline
          minRows={3}
          fullWidth
          disabled={draft.saving}
          sx={studioFieldSx}
        />
      </StudioSection>
    </>
  );
}

/** « מתי » (date et heure, comme une tâche פעם אחת) et « מי מבצע ». */
function WhenWhoSections({ draft, form }: Ready) {
  return (
    <>
      <StudioSection title={he.studioWhenTitle} testId="studio-when">
        <StudioSchedule
          value={{ recurrence: "daily", dueTime: splitDueAt(form.due_at).time, weeklyDays: "", monthlyDay: 1 }}
          onChange={() => undefined}
          once={{ dueAt: form.due_at, onChange: (due_at) => draft.patch({ due_at }) }}
          disabled={draft.saving}
        />
      </StudioSection>
      <StudioSection title={he.studioWhoTitle} testId="studio-who">
        <StudioAssigneePicker
          employees={draft.people}
          value={form.assignee_user_id}
          onChange={(assignee_user_id) => draft.patch({ assignee_user_id })}
          currentUserId={draft.currentUserId}
          disabled={draft.saving}
        />
      </StudioSection>
    </>
  );
}

function SwitchRow({ label, hint, checked, onChange, testId }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void; testId: string }) {
  return (
    <Box data-testid={testId} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "16px", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100 }}>
      <Box>
        <Typography sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{label}</Typography>
        {hint ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{hint}</Typography> : null}
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} inputProps={{ "aria-label": label }} />
    </Box>
  );
}

/** Tâche réseau : appliquer la modification à tous les snifim. */
function NetworkSection({ draft, form }: Ready) {
  if (!draft.networkScope) return null;
  return (
    <StudioSection title={he.studioNetworkScope}>
      <SwitchRow label={he.fixedTaskUpdateAllBranches} hint={form.apply_to_network ? he.fixedTaskUpdateAllBranchesHint : undefined} checked={form.apply_to_network} onChange={(apply_to_network) => draft.patch({ apply_to_network })} testId="studio-network-scope" />
    </StudioSection>
  );
}

/** « המשימה הבאה » (effet immédiat) et le chat avec l'oved. */
function ActionsSection({ props, task, onChat }: { props: Props; task: TaskOccurrence; onChat: () => void }) {
  const row = props.listTask ?? task;
  const next = props.onSetManagerNext && canMarkManagerNext(row);
  return (
    <StudioSection title={he.studioTaskActions} testId="studio-task-actions">
      {next ? <SwitchRow label={he.managerNextTask} checked={isManagerNextTask(row)} onChange={(enabled) => props.onSetManagerNext?.(row, enabled)} testId="studio-manager-next" /> : null}
      <ButtonBase data-testid="studio-open-chat" onClick={onChat} sx={studioSecondarySx}>{he.managerReviewOpenChat}</ButtonBase>
    </StudioSection>
  );
}

function useSaveAction(props: Props, draft: OccurrenceEditDraft, form: Ready["form"], task: TaskOccurrence) {
  const { showError } = useFeedback();
  const blocker = occurrenceEditBlocker(form, task);
  const save = () => {
    if (blocker) return;
    draft.save().then((message) => { props.onSaved(message); props.onClose(); }).catch((e) => showError(errorText(e)));
  };
  return { blocker, save };
}

/**
 * Tâche du jour pas encore terminée, dans le style du studio : mêmes cartes que l'oved,
 * « מתי » / « מי מבצע » en blocs, barre « שמירת שינויים » seulement s'il y a des changements.
 */
function EditStudio({ props, ready }: { props: Props; ready: Ready }) {
  const { draft, task, form } = ready;
  const [moreOpen, setMoreOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { blocker, save } = useSaveAction(props, draft, form, task);
  const back = () => (draft.dirty ? setLeaving(true) : props.onClose());
  const person = draft.people.find((u) => u.id === form.assignee_user_id);
  const header = (
    <StudioHeader kicker={he.studioKickerEditDay} title={form.title} onTitleChange={(title) => draft.patch({ title })} scheduleLine={onceScheduleLine(form.due_at)} onBack={back} onPreview={() => setPreviewOpen(true)} onMore={() => setMoreOpen(true)} disabled={draft.saving} />
  );
  const footer = draft.dirty ? (
    <StudioSaveBar label={he.studioSave} onSave={save} saving={draft.saving} disabled={Boolean(blocker)} note={blocker || he.studioUnsaved} noteTestId="studio-unsaved" />
  ) : null;
  return (
    <StudioScreen header={header} footer={footer} onBack={back}>
      <SentSoFar task={task} />
      <WhatSections {...ready} />
      <WhenWhoSections {...ready} />
      <NetworkSection {...ready} />
      <ActionsSection props={props} task={task} onChat={() => setChatOpen(true)} />
      <EditOverlays props={props} ready={ready} more={{ open: moreOpen, close: () => setMoreOpen(false) }} preview={{ open: previewOpen, close: () => setPreviewOpen(false), person }} chat={{ open: chatOpen, close: () => setChatOpen(false) }} />
      <StudioLeaveDialog open={leaving} onStay={() => setLeaving(false)} onLeave={props.onClose} />
    </StudioScreen>
  );
}

type Toggle = { open: boolean; close: () => void };
type OverlaysProps = { props: Props; ready: Ready; more: Toggle; preview: Toggle & { person?: User }; chat: Toggle };

/** « הגדרות נוספות » (fichiers joints, lien, suppression), aperçu oved et chat de la tâche. */
function EditOverlays({ props, ready, more, preview, chat }: OverlaysProps) {
  const { draft, task, form } = ready;
  const remove = props.onDelete ? { label: he.managerTasksDelete, onClick: () => { more.close(); props.onDelete?.(task); } } : undefined;
  return (
    <>
      <StudioMoreSheet
        open={more.open}
        onClose={more.close}
        disabled={draft.saving}
        media={form}
        onMediaChange={draft.setMedia}
        onTranscript={(t) => draft.patch({ description: appendDescriptionBlock(form.description, t) })}
        advanced={{ startUrl: form.start_url ?? "", opsCategory: "", isWorkStart: false, isWorkEnd: false }}
        onAdvancedChange={(p) => { if (p.startUrl !== undefined) draft.patch({ start_url: p.startUrl }); }}
        advancedKind="ad_hoc"
        remove={remove}
      />
      <StudioPreview open={preview.open} onClose={preview.close} title={form.title} dueTime={splitDueAt(form.due_at).time} requirements={form.completion_requirements} employeeName={preview.person?.full_name ?? task.assignee_name} photoUrl={preview.person?.avatar_url} />
      <TaskChatDialog
        open={chat.open}
        onClose={chat.close}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        employee={false}
        chatFollowUpAt={task.chat_follow_up_at}
        chatResolvedAt={task.chat_resolved_at}
        completion={task.completion ?? null}
        onOccurrenceUpdated={(_status, notice) => { if (notice !== he.taskChatSent) props.onSaved(notice); }}
      />
    </>
  );
}

function LoadedScreen({ props, occurrenceId }: { props: Props; occurrenceId: string }) {
  const draft = useOccurrenceEditDraft(occurrenceId, props.employees);
  if (draft.task && draft.form) return <EditStudio props={props} ready={{ draft, task: draft.task, form: draft.form }} />;
  const header = <StudioHeader kicker={he.studioKickerEditDay} title="" scheduleLine="" onBack={props.onClose} />;
  return (
    <StudioScreen header={header} onBack={props.onClose}>
      {draft.error ? <Alert severity="error">{draft.error}</Alert> : <CircularProgress sx={{ alignSelf: "center", color: flowColor.navy800 }} />}
    </StudioScreen>
  );
}

/** Ouvrir une tâche pas encore terminée (onglet משימות, fiche d'un oved, accueil) : l'édition plein écran du studio. */
export default function ManagerTaskEditScreen(props: Props) {
  if (!props.occurrenceId) return null;
  return <LoadedScreen key={props.occurrenceId} props={props} occurrenceId={props.occurrenceId} />;
}
