import type { CompletionAttachment } from "./completionMedia";
import { remoteVideoUrls, waitUntilRemoteVideosReady } from "./uploadedVideoReady";

export function scheduleConfirmCompletionMedia(
  taskId: string,
  attachments: CompletionAttachment[],
  confirm: (id: string) => Promise<{ media_ready: boolean }>,
  isReady: (url: string) => Promise<boolean>,
): void {
  const urls = remoteVideoUrls(attachments);
  if (!urls.length) return;
  void waitUntilRemoteVideosReady(urls, isReady)
    .then(() => confirm(taskId))
    .catch(() => undefined);
}
