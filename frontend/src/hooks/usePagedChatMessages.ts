import { useCallback, useEffect, useRef, useState } from "react";
import { mergeNewerMessages, mergeOlderMessages, type ChatMessagePage } from "../utils/chatPage";

interface UsePagedChatMessagesOptions<T extends { id: string }> {
  enabled: boolean;
  fetchPage: (before?: string) => Promise<ChatMessagePage<T>>;
  onError?: (error: unknown) => void;
}

export function usePagedChatMessages<T extends { id: string }>({
  enabled,
  fetchPage,
  onError,
}: UsePagedChatMessagesOptions<T>) {
  const [messages, setMessages] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const stickToBottom = useRef(true);

  const loadLatest = useCallback(async (quiet = false) => {
    if (!enabled) return;
    if (!quiet) setLoading(true);
    try {
      const page = await fetchPage();
      setMessages((prev) => (quiet ? mergeNewerMessages(prev, page.messages) : page.messages));
      if (!quiet) setHasMore(page.has_more);
      if (!quiet) stickToBottom.current = true;
    } catch (error) {
      if (!quiet) onError?.(error);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [enabled, fetchPage, onError]);

  const loadOlder = useCallback(async () => {
    if (!enabled || !hasMore || loadingOlder || messages.length === 0) return;
    stickToBottom.current = false;
    setLoadingOlder(true);
    try {
      const page = await fetchPage(messages[0].id);
      setMessages((prev) => mergeOlderMessages(prev, page.messages));
      setHasMore(page.has_more);
    } catch (error) {
      onError?.(error);
    } finally {
      setLoadingOlder(false);
    }
  }, [enabled, fetchPage, hasMore, loadingOlder, messages, onError]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  return { messages, hasMore, loading, loadingOlder, loadLatest, loadOlder, stickToBottom };
}
