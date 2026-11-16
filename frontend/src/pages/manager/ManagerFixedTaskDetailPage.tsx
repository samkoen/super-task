import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert } from "@mui/material";
import type { FixedTaskBranch, FixedTaskGroup } from "../../services/fixedTaskService";
import ConfirmDeleteDialog from "../../components/ui/ConfirmDeleteDialog";
import ListSkeleton from "../../components/ui/ListSkeleton";
import FixedTaskBranchesTab from "../../components/tasks/fixed/FixedTaskBranchesTab";
import FixedTaskBranchSheet from "../../components/tasks/fixed/FixedTaskBranchSheet";
import FixedTaskEditStudio, { type EditTabId } from "../../components/tasks/fixed/studio/FixedTaskEditStudio";
import { useFixedTaskDetail } from "../../hooks/useFixedTaskDetail";
import { useGoBackOr } from "../../hooks/useGoBackOr";
import { he } from "../../i18n/he";
import { assigneesForBranch } from "../../utils/assigneeOptions";
import { asText } from "../../utils/asList";

type TabId = EditTabId;
type Detail = ReturnType<typeof useFixedTaskDetail>;
type DeleteTarget = { templateId: string; all: boolean; name: string };

/** Onglets disponibles : réglages généraux (qui peut les modifier) et snifim (tâche réseau). */
export function availableTabs(group: Pick<FixedTaskGroup, "is_network" | "can_edit_defaults">): TabId[] {
  const tabs: TabId[] = [];
  if (group.can_edit_defaults) tabs.push("general");
  if (group.is_network) tabs.push("branches");
  return tabs;
}

function BranchSheetHost({
  detail,
  group,
  branch,
  onClose,
  onRemove,
}: {
  detail: Detail;
  group: FixedTaskGroup;
  branch: FixedTaskBranch;
  onClose: () => void;
  onRemove: (target: DeleteTarget) => void;
}) {
  const canRemove = group.can_edit_defaults && group.branch_count > 1;
  return (
    <FixedTaskBranchSheet
      group={group}
      branch={branch}
      employees={assigneesForBranch(detail.employees, branch.branch_id, detail.user?.id)}
      currentUserId={detail.user?.id}
      saving={detail.saving}
      onClose={onClose}
      onSave={async (form) => {
        if (await detail.saveBranch(branch, form)) onClose();
      }}
      onLinkCustomer={(name) => detail.linkCustomer(branch.branch_id, name)}
      onRemove={
        canRemove
          ? () => onRemove({ templateId: branch.template_id, all: false, name: asText(branch.branch_name) })
          : undefined
      }
    />
  );
}

function DeleteHost({
  detail,
  group,
  target,
  listPath,
  onClose,
}: {
  detail: Detail;
  group: FixedTaskGroup;
  target: DeleteTarget | null;
  listPath: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const confirm = async () => {
    if (!target || !(await detail.remove(target.templateId, target.all))) return;
    onClose();
    if (target.all || group.branch_count === 1) navigate(listPath);
    else await detail.reload();
  };
  return (
    <ConfirmDeleteDialog
      open={Boolean(target)}
      title={target?.all ? he.fixedDetailDeleteNetwork : he.fixedDetailRemoveFromBranch}
      itemName={target?.name}
      message={he.managerFixedTasksDeleteConfirm}
      saving={detail.saving}
      onCancel={onClose}
      onConfirm={() => void confirm()}
    />
  );
}

function FixedTaskDetailView({ detail, group }: { detail: Detail; group: FixedTaskGroup }) {
  const listPath = useLocation().pathname.startsWith("/admin") ? "/admin/fixed-tasks" : "/manager/fixed-tasks";
  const goBack = useGoBackOr(listPath);
  const [openBranch, setOpenBranch] = useState<FixedTaskBranch | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  return (
    <>
      <FixedTaskEditStudio
        key={group.key}
        group={group}
        employees={detail.employees}
        currentUserId={detail.user?.id}
        saving={detail.saving}
        tabs={availableTabs(group)}
        branchesView={
          <FixedTaskBranchesTab
            group={group}
            onOpenBranch={setOpenBranch}
            onToggleActive={(b) => void detail.toggleBranch(b)}
          />
        }
        onSave={detail.saveGeneral}
        onDelete={() =>
          setDeleting({ templateId: group.template_ids[0], all: group.is_network, name: asText(group.title) })
        }
        onBack={goBack}
        onError={detail.showError}
        onLinkCustomer={(name) => detail.linkCustomer(group.branches[0]?.branch_id ?? "", name)}
      />
      {openBranch ? (
        <BranchSheetHost
          detail={detail}
          group={group}
          branch={openBranch}
          onClose={() => setOpenBranch(null)}
          onRemove={(target) => {
            setOpenBranch(null);
            setDeleting(target);
          }}
        />
      ) : null}
      <DeleteHost detail={detail} group={group} target={deleting} listPath={listPath} onClose={() => setDeleting(null)} />
    </>
  );
}

export default function ManagerFixedTaskDetailPage() {
  const { key = "" } = useParams();
  const detail = useFixedTaskDetail(key);
  if (detail.loading && !detail.group) return <ListSkeleton variant="table" />;
  if (detail.loadError || !detail.group) {
    return <Alert severity="error">{detail.loadError || he.fixedDetailNotFound}</Alert>;
  }
  return <FixedTaskDetailView detail={detail} group={detail.group} />;
}
