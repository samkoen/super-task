import { useCallback, useRef, useState } from "react";
import { he } from "../i18n/he";
import type { ChatMediaKind } from "../utils/chatTransport";
import { parseRecipientBreak, type BreakAlertTarget } from "../utils/breakAlert";
import { chatErrorMessage, type ChatSendResult, type ChatTransport } from "../utils/chatTransport";
import { usePagedChatMessages } from "./usePagedChatMessages";
import { useChatPhotoAnnotateReply } from "./useChatPhotoAnnotateReply";

function useChatBusy() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const runBusy = useCallback(async (work: () => Promise<void>) => {
    setSending(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(chatErrorMessage(e));
    } finally {
      setSending(false);
    }
  }, []);
  return { sending, error, setError, runBusy };
}

export function useChatThread(opts: { transport: ChatTransport; enabled: boolean }) {
  const [body, setBody] = useState("");
  const [breakAlert, setBreakAlert] = useState<BreakAlertTarget | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const transportRef = useRef(opts.transport);
  transportRef.current = opts.transport;
  const { sending, error, setError, runBusy } = useChatBusy();

  const fetchPage = useCallback(async (before?: string) => {
    try {
      return await transportRef.current.list(before);
    } catch (e) {
      setError(chatErrorMessage(e));
      throw e;
    }
  }, [setError]);

  const paged = usePagedChatMessages({ enabled: opts.enabled, fetchPage });
  const send = useChatSend({
    body,
    setBody,
    enabled: opts.enabled,
    transportRef,
    loadLatest: paged.loadLatest,
    stickToBottom: paged.stickToBottom,
    setBreakAlert,
    runBusy,
    setError,
  });

  return {
    ...paged,
    body,
    setBody,
    sending,
    error,
    breakAlert,
    setBreakAlert,
    bottomRef,
    ...send,
    runBusy,
  };
}

function useChatSend(args: {
  body: string;
  setBody: (value: string) => void;
  enabled: boolean;
  transportRef: { current: ChatTransport };
  loadLatest: (quiet?: boolean) => Promise<unknown>;
  stickToBottom: { current: boolean };
  setBreakAlert: (value: BreakAlertTarget | null) => void;
  runBusy: (work: () => Promise<void>) => Promise<void>;
  setError: (value: string) => void;
}) {
  const { body, setBody, enabled, transportRef, loadLatest, stickToBottom, setBreakAlert, runBusy, setError } = args;

  const afterSend = useCallback(async (result: ChatSendResult) => {
    setBreakAlert(parseRecipientBreak(result.breakFrom));
    stickToBottom.current = true;
    if (enabled) await loadLatest(true);
    setBody("");
  }, [enabled, loadLatest, setBody, setBreakAlert, stickToBottom]);

  const sendText = useCallback(async () => {
    const text = body.trim();
    if (!text) {
      setError(he.taskChatNeedContent);
      return;
    }
    await runBusy(async () => {
      await afterSend(await transportRef.current.send({ body: text }));
    });
  }, [afterSend, body, runBusy, setError, transportRef]);

  const sendMedia = useCallback((file: File, kind: ChatMediaKind) => {
    return runBusy(async () => {
      await afterSend(await transportRef.current.send(
        await transportRef.current.upload(file, kind),
      ));
    });
  }, [afterSend, runBusy, transportRef]);

  return {
    sendText,
    sendMedia,
    annotateReply: useChatPhotoAnnotateReply((file) => sendMedia(file, "photo")),
  };
}

export type ChatThreadState = ReturnType<typeof useChatThread>;
