import api from "./api";
import { mailAudioFileName } from "../utils/audioToMailSafe";

export interface SystemBugInboxItem {
  id: string;
  reporter_user_id: string | null;
  reporter_name: string;
  reporter_role: string;
  branch_name: string;
  network_name: string;
  note: string;
  route: string;
  trail: string[];
  app_version: string;
  screenshot_url: string | null;
  audio_url: string | null;
  github_issue_url: string | null;
  status: "open" | "closed";
  created_at: string;
}

export async function submitSystemBug(payload: {
  note: string;
  route: string;
  trail: string[];
  appVersion: string;
  preview?: string;
  branchName?: string;
  screenshot?: Blob | null;
  audio?: Blob | null;
}): Promise<void> {
  const form = new FormData();
  form.append("note", payload.note);
  form.append("route", payload.route);
  form.append("trail", JSON.stringify(payload.trail));
  form.append("app_version", payload.appVersion);
  form.append("preview", payload.preview ?? "");
  form.append("branch_name", payload.branchName ?? "");
  if (payload.screenshot && payload.screenshot.size > 0) {
    form.append("screenshot", payload.screenshot, "screenshot.jpg");
  }
  if (payload.audio && payload.audio.size > 0) {
    form.append("audio", payload.audio, mailAudioFileName(payload.audio));
  }
  await api.post("/system-bugs", form, { timeout: 60_000 });
}

export async function listSystemBugs(): Promise<SystemBugInboxItem[]> {
  const response = await api.get<{ items: SystemBugInboxItem[] }>("/system-bugs");
  return response.data.items;
}

export async function getSystemBug(reportId: string): Promise<SystemBugInboxItem> {
  const response = await api.get<{ report: SystemBugInboxItem }>(`/system-bugs/${reportId}`);
  return response.data.report;
}

export async function deleteSystemBug(reportId: string): Promise<void> {
  await api.delete(`/system-bugs/${reportId}`);
}

export async function setSystemBugStatus(
  reportId: string,
  status: "open" | "closed",
): Promise<SystemBugInboxItem> {
  const response = await api.patch<{ report: SystemBugInboxItem }>(`/system-bugs/${reportId}`, {
    status,
  });
  return response.data.report;
}
