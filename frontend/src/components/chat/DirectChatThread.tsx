import { useMemo, useRef } from "react";
import { Alert } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { useChatThread } from "../../hooks/useChatThread";
import { createDirectChatTransport } from "../../utils/directChatTransport";
import ChatThread from "./ChatThread";

interface DirectChatThreadProps {
  conversationId: string | null;
  broadcast?: boolean;
  onSent?: () => void;
}

export default function DirectChatThread({
  conversationId,
  broadcast = false,
  onSent,
}: DirectChatThreadProps) {
  const { user } = useAuth();
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;
  const transport = useMemo(
    () => createDirectChatTransport({
      conversationId,
      broadcast,
      onSent: () => onSentRef.current?.(),
    }),
    [conversationId, broadcast],
  );
  const thread = useChatThread({
    transport,
    enabled: Boolean(conversationId) && !broadcast,
  });
  useDirectChatLiveSync(broadcast ? null : conversationId, () => void thread.loadLatest(true));

  return (
    <ChatThread
      thread={thread}
      myId={user?.id}
      emptyText={he.directChatEmpty}
      placeholder={he.directChatPlaceholder}
      sendLabel={broadcast ? he.directChatBroadcast : he.taskChatSend}
      fillHeight
      hideList={broadcast}
      banner={broadcast ? <Alert severity="info">{he.directChatBroadcastHint}</Alert> : null}
    />
  );
}
