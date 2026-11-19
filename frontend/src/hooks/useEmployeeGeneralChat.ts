import { useState } from "react";
import { ApiError } from "../services/api";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import {
  employeeManagerLabel,
  employeeOpenMineScope,
  needsEmployeeManagerPicker,
} from "../utils/employeeDirectChat";

/**
 * Ouverture du chat général oved : direct s'il n'y a qu'une menahelet,
 * sinon via le choix du manager (ManagerPickerDialog).
 */
export function useEmployeeGeneralChat(managers: DirectChatCard[], defaultTitle: string) {
  const { showError } = useFeedback();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [pickerOpen, setPickerOpen] = useState(false);

  const open = async (scope?: "branch" | "network", nextTitle = defaultTitle) => {
    try {
      const opened = await directChatService.openMine(scope);
      setConversationId(opened.conversation.id);
      setTitle(nextTitle);
      setPickerOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const start = async () => {
    if (needsEmployeeManagerPicker(managers)) {
      setPickerOpen(true);
      return;
    }
    await open(employeeOpenMineScope(managers), defaultTitle);
  };

  const pick = (card: DirectChatCard) =>
    open(card.scope === "network" ? "network" : "branch", employeeManagerLabel(card));

  return {
    conversationId,
    title,
    pickerOpen,
    start,
    pick,
    close: () => setConversationId(null),
    closePicker: () => setPickerOpen(false),
  };
}
