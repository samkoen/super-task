import { taskService } from "../services/taskService";
import { attachmentsFromCompletion } from "./completionSlotView";
import { uploadChatMedia } from "./chatTransport";
import type { CompletionAttachment } from "./completionMedia";

export type ReviewPhotoMark = {
  sourceUrl: string;
  file: File;
};

export function completionPhotoUrls(completion: {
  completion_attachments?: CompletionAttachment[] | null;
  photo_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
} | null | undefined): string[] {
  return attachmentsFromCompletion(completion)
    .filter((item) => item.kind === "photo" && item.url)
    .map((item) => item.url);
}

export function upsertReviewPhotoMark(
  marks: ReviewPhotoMark[],
  next: ReviewPhotoMark,
): ReviewPhotoMark[] {
  return [...marks.filter((item) => item.sourceUrl !== next.sourceUrl), next];
}

export function markedPhotoUrls(marks: ReviewPhotoMark[]): string[] {
  return marks.map((item) => item.sourceUrl);
}

export function reopenNoteForMarks(note: string, fallbackNote: string): string {
  return note.trim() || fallbackNote;
}

export async function reopenReviewedTask(input: {
  occurrenceId: string;
  note: string;
  fallbackNote: string;
  marks: ReviewPhotoMark[];
}): Promise<void> {
  const note = reopenNoteForMarks(input.note, input.fallbackNote);
  if (!input.marks.length) {
    await taskService.reopen(input.occurrenceId, { rejection_note: note });
    return;
  }
  await sendReviewReopenMarks(input.occurrenceId, input.marks, note);
}

export async function sendReviewReopenMarks(
  occurrenceId: string,
  marks: ReviewPhotoMark[],
  note: string,
): Promise<void> {
  const uploaded = [];
  for (const mark of marks) {
    uploaded.push(await uploadChatMedia(taskService, mark.file, "photo"));
  }
  for (const [index, media] of uploaded.entries()) {
    await taskService.postMessage(occurrenceId, {
      ...media,
      body: index === 0 ? note : undefined,
    });
  }
}
