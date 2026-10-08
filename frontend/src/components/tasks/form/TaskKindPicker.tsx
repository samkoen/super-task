import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { he } from "../../../i18n/he";
import ChoiceCards, { type ChoiceCardOption } from "../../ui/ChoiceCards";

export type TaskKind = "ad_hoc" | "fixed";

const OPTIONS: ChoiceCardOption<TaskKind>[] = [
  { value: "ad_hoc", icon: TaskAltIcon, label: he.taskKindLabels.ad_hoc, hint: he.taskKindHints.ad_hoc },
  { value: "fixed", icon: EventRepeatIcon, label: he.taskKindLabels.fixed, hint: he.taskKindHints.fixed },
];

/** Choix du type de tâche : deux grandes cartes qui expliquent la différence en une phrase. */
export default function TaskKindPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: TaskKind;
  onChange: (kind: TaskKind) => void;
  disabled?: boolean;
}) {
  return (
    <ChoiceCards options={OPTIONS} value={value} onChange={onChange} ariaLabel={he.taskKind} disabled={disabled} />
  );
}
