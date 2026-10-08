import { Avatar, Badge, Dialog, List, ListItemButton, ListItemText } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { he } from "../../i18n/he";
import type { DirectChatCard } from "../../services/directChatService";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_GRADIENT, EMPLOYEE_INK } from "../../styles/employeeUi";
import { employeeManagerLabel } from "../../utils/employeeDirectChat";
import AppDialogTitle from "../ui/AppDialogTitle";
import { unreadBadgeSx } from "./EmployeeChatRowItem";

/** Choix du manager quand l'employé en a plusieurs : grands boutons nominatifs. */
export default function ManagerPickerDialog({
  open,
  managers,
  onPick,
  onClose,
}: {
  open: boolean;
  managers: DirectChatCard[];
  onPick: (card: DirectChatCard) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <AppDialogTitle title={he.chatPickManager} onClose={onClose} />
      <List sx={{ px: 2, pb: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {managers.map((card) => (
          <ManagerPickRow key={`${card.scope}-${card.counterpart_user_id}`} card={card} onPick={onPick} />
        ))}
      </List>
    </Dialog>
  );
}

function ManagerPickRow({ card, onPick }: { card: DirectChatCard; onPick: (card: DirectChatCard) => void }) {
  const label = employeeManagerLabel(card);
  return (
    <ListItemButton
      onClick={() => onPick(card)}
      sx={{ minHeight: 68, gap: 1.5, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}
    >
      <Avatar sx={{ width: 48, height: 48, color: "#fff", fontWeight: 800, background: EMPLOYEE_BRAND_GRADIENT }}>
        <PersonOutlineIcon />
      </Avatar>
      <ListItemText
        primary={label}
        primaryTypographyProps={{ fontWeight: 800, fontSize: "1.1rem", color: EMPLOYEE_INK }}
      />
      {card.unread_count ? (
        <Badge badgeContent={card.unread_count} max={99} color="error" sx={unreadBadgeSx} />
      ) : null}
      <ChevronLeftIcon sx={{ color: EMPLOYEE_BRAND }} />
    </ListItemButton>
  );
}
