import api from "./api";
import { mailAudioFileName } from "../utils/audioToMailSafe";

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
