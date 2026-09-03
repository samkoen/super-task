import { useEffect, type ReactNode } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { systemBottomInsetCss } from "../../utils/systemInsets";
import type { ChatThreadState } from "../../hooks/useChatThread";
import BreakAlertDialog from "./BreakAlertDialog";
import ChatComposerBar from "./ChatComposerBar";
import ChatMessageList from "./ChatMessageList";
import ChatPhotoAnnotateReplyDialog from "./ChatPhotoAnnotateReplyDialog";

type ChatThreadProps = {
  thread: ChatThreadState;
  myId?: string;
  emptyText: string;
  placeholder?: string;
  sendLabel?: string;
  composeEnabled?: boolean;
  layout?: "fill" | "bounded";
  compact?: boolean;
  highlightEmployee?: boolean;
  fillHeight?: boolean;
  stickyComposer?: boolean;
  hideList?: boolean;
  header?: ReactNode;
  banner?: ReactNode;
};

export default function ChatThread({
  thread,
  myId,
  emptyText,
  placeholder,
  sendLabel,
  composeEnabled = true,
  layout = "fill",
  compact = false,
  highlightEmployee = false,
  fillHeight = false,
  stickyComposer = false,
  hideList = false,
  header,
  banner,
}: ChatThreadProps) {
  useStickToBottom(thread);
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={1.5}
      sx={fillHeight ? { minHeight: 0, flex: 1, pb: systemBottomInsetCss() } : undefined}
    >
      {header}
      {banner}
      {!hideList && (
        <ChatThreadFeed
          thread={thread}
          myId={myId}
          emptyText={emptyText}
          composeEnabled={composeEnabled}
          layout={layout}
          compact={compact}
          highlightEmployee={highlightEmployee}
        />
      )}
      <ChatThreadCompose
        thread={thread}
        composeEnabled={composeEnabled}
        sticky={stickyComposer}
        placeholder={placeholder}
        sendLabel={sendLabel}
      />
      <ChatPhotoAnnotateReplyDialog
        photoUrl={thread.annotateReply.photoUrl}
        sending={thread.sending}
        onClose={thread.annotateReply.close}
        onSend={thread.annotateReply.submit}
      />
      <BreakAlertDialog target={thread.breakAlert} onClose={() => thread.setBreakAlert(null)} />
    </Box>
  );
}

function useStickToBottom(thread: ChatThreadState) {
  useEffect(() => {
    if (thread.stickToBottom.current) {
      thread.bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [thread.messages.length, thread.loading, thread.stickToBottom, thread.bottomRef]);
}

function ChatThreadFeed({
  thread,
  myId,
  emptyText,
  composeEnabled,
  layout,
  compact,
  highlightEmployee,
}: {
  thread: ChatThreadState;
  myId?: string;
  emptyText: string;
  composeEnabled: boolean;
  layout: "fill" | "bounded";
  compact: boolean;
  highlightEmployee: boolean;
}) {
  if (thread.loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (thread.messages.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
    );
  }
  return (
    <ChatMessageList
      messages={thread.messages}
      myId={myId}
      hasMore={thread.hasMore}
      loadingOlder={thread.loadingOlder}
      onLoadOlder={() => void thread.loadOlder()}
      bottomRef={thread.bottomRef}
      composeEnabled={composeEnabled}
      onAnnotateReply={thread.annotateReply.start}
      layout={layout}
      compact={compact}
      highlightEmployee={highlightEmployee}
    />
  );
}

function ChatThreadCompose({
  thread,
  composeEnabled,
  sticky,
  placeholder,
  sendLabel,
}: {
  thread: ChatThreadState;
  composeEnabled: boolean;
  sticky: boolean;
  placeholder?: string;
  sendLabel?: string;
}) {
  if (!composeEnabled) {
    return thread.error ? <Alert severity="error">{thread.error}</Alert> : null;
  }
  const bar = (
    <ChatComposerBar
      body={thread.body}
      onBodyChange={thread.setBody}
      sending={thread.sending}
      error={thread.error}
      placeholder={placeholder}
      sendLabel={sendLabel}
      onSendText={() => void thread.sendText()}
      onSendMedia={thread.sendMedia}
    />
  );
  if (!sticky) return bar;
  return (
    <Box sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", pt: 0.5, zIndex: 1 }}>
      {bar}
    </Box>
  );
}
