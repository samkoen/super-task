import api from "./api";
import { compressPhotoForUpload } from "../utils/mediaCapture";
import { uploadVideoFile } from "../utils/videoUpload";

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
  const payload = kind === "photo" ? await compressPhotoForUpload(file) : file;
  const form = new FormData();
  form.append("file", payload);
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

  deleteReport: async (reportId: string) => {
    const response = await api.delete<{ ok: boolean; message: string }>(`/issue-reports/${reportId}`);
    return response.data;
  },

  uploadPhoto: async (file: File) => uploadIssueFile(file, "photo"),

  uploadVideo: async (file: File) =>
    uploadVideoFile(file, "issue", (payload) => uploadIssueFile(payload, "video")),

  uploadAudio: async (file: File) => uploadIssueFile(file, "audio"),
};
