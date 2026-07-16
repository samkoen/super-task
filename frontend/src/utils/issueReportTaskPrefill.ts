import type { IssueReport } from "../services/issueReportService";
import { he } from "../i18n/he";

export interface AdHocTaskPrefillFromIssue {
  branch_id: string;
  title: string;
  description: string;
  assignee_user_id: string;
  reference_photo_url: string;
  reference_video_url: string;
  reference_audio_url: string;
}

export function buildAdHocPrefillFromIssue(report: IssueReport): AdHocTaskPrefillFromIssue {
  const text = (report.text || "").trim();
  const title = text
    ? text.length > 60
      ? `${text.slice(0, 57)}…`
      : text
    : he.issueReportTaskDefaultTitle;
  return {
    branch_id: report.branch_id,
    title,
    description: text || he.issueReportTaskDefaultDescription,
    assignee_user_id: report.reporter_user_id,
    reference_photo_url: report.photo_url || "",
    reference_video_url: report.video_url || "",
    reference_audio_url: report.audio_url || "",
  };
}
