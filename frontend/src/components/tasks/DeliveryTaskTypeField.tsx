import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PublicIcon from "@mui/icons-material/Public";
import { he } from "../../i18n/he";
import {
  DELIVERY_TASK_LINE_CHECK,
  DELIVERY_TASK_ORIGIN,
} from "../../utils/deliveryNote";
import ChoiceCards, { type ChoiceCardOption } from "../ui/ChoiceCards";

const OPTIONS: ChoiceCardOption<string>[] = [
  {
    value: DELIVERY_TASK_LINE_CHECK,
    icon: FactCheckOutlinedIcon,
    label: he.deliveryNoteTaskTypeLineCheck,
    hint: he.deliveryNoteTaskTypeLineCheckHint,
  },
  {
    value: DELIVERY_TASK_ORIGIN,
    icon: PublicIcon,
    label: he.deliveryNoteTaskTypeOrigin,
    hint: he.deliveryNoteTaskTypeOriginHint,
  },
];

type Props = {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Ce que l'oved fera de la teuda : contrôler chaque ligne, ou simplement voir les pays d'origine. */
export default function DeliveryTaskTypeField({ value, onChange, disabled = false }: Props) {
  return (
    <ChoiceCards
      options={OPTIONS}
      value={value || DELIVERY_TASK_LINE_CHECK}
      onChange={onChange}
      ariaLabel={he.deliveryNoteTaskType}
      disabled={disabled}
    />
  );
}
