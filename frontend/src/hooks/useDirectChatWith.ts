import { useCallback, useState } from "react";
import { directChatService } from "../services/directChatService";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import { apiErrorMessage } from "../utils/apiErrorMessage";

/** Ouvre (ou crée) la conversation directe du menahel avec un oved. */
export function useDirectChatWith() {
  const { showError } = useFeedback();
  const [chat, setChat] = useState<{ id: string; title: string } | null>(null);
  const open = useCallback(async (userId: string, title: string) => {
    try {
      const opened = await directChatService.openWith(userId);
      setChat({ id: opened.conversation.id, title });
    } catch (e) {
      showError(apiErrorMessage(e, he.errorGeneric));
    }
  }, [showError]);
  return { chat, open, close: useCallback(() => setChat(null), []) };
}
