import api from "./api";

export interface IssueReport {
  id: string;
  reporter_user_id: string;
  reporter_name?: string | null;
  branch_id: string;
  branch_name?: string | null;
  text: string | null;
  photo_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface CreateIssueReportPayload {
  text?: string;
  photo_url?: string;
  video_url?: string;
  audio_url?: string;
}

async function uploadIssueFile(file: File, kind: "photo" | "video" | "audio") {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ url: string; kind: string }>(
    `/issue-reports/upload-${kind}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

export const issueReportService = {
  createReport: async (payload: CreateIssueReportPayload) => {
    const response = await api.post<{ report: IssueReport }>("/issue-reports", payload);
    return response.data.report;
  },

  listReports: async () => {
    const response = await api.get<{ items: IssueReport[] }>("/issue-reports");
    return response.data.items;
  },

  getReport: async (reportId: string) => {
    const response = await api.get<{ report: IssueReport }>(`/issue-reports/${reportId}`);
    return response.data.report;
  },

  uploadPhoto: async (file: File) => uploadIssueFile(file, "photo"),

  uploadVideo: async (file: File) => uploadIssueFile(file, "video"),

  uploadAudio: async (file: File) => uploadIssueFile(file, "audio"),
};
