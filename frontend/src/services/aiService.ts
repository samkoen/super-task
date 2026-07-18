import api from "./api";

export type AiProviderId = "gemini" | "opencode";

export type AiChatRole = "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  configured: boolean;
  model: string;
  is_default: boolean;
}

export interface AiStatusResponse {
  available: AiProviderId[];
  default: AiProviderId;
  voice_available?: boolean;
  tts_available?: boolean;
  tts_model?: string | null;
  providers: AiProviderStatus[];
}

export interface AiChatResponse {
  reply: string;
  provider: AiProviderId;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  provider?: AiProviderId;
  system?: string;
  for_generation?: boolean;
}

export interface AiCompleteRequest {
  prompt: string;
  provider?: AiProviderId;
  system?: string;
  for_generation?: boolean;
}

export interface TaskVoiceDraft {
  title: string;
  description: string;
  assignee_user_id: string | null;
  assignee_name: string | null;
}

export interface TaskVoiceRequest {
  branchId: string;
  taskKind: "fixed" | "ad_hoc";
  file: File;
}

export const aiService = {
  getStatus: async () => {
    const response = await api.get<AiStatusResponse>("/ai/status");
    return response.data;
  },

  chat: async (payload: AiChatRequest) => {
    const response = await api.post<AiChatResponse>("/ai/chat", payload, {
      timeout: 300_000,
    });
    return response.data;
  },

  complete: async (payload: AiCompleteRequest) => {
    const response = await api.post<AiChatResponse>("/ai/complete", payload, {
      timeout: 300_000,
    });
    return response.data;
  },

  parseTaskFromVoice: async ({ branchId, taskKind, file }: TaskVoiceRequest) => {
    const form = new FormData();
    form.append("branch_id", branchId);
    form.append("task_kind", taskKind);
    form.append("file", file);
    const response = await api.post<TaskVoiceDraft>("/ai/task-from-voice", form, {
      timeout: 300_000,
    });
    return response.data;
  },

  speakTask: async (text: string, language: string) => {
    const response = await api.post<Blob>(
      "/ai/task-tts",
      { text, language },
      {
        timeout: 120_000,
        responseType: "blob",
      }
    );
    return response.data;
  },

  transcribeReferenceAudio: async (audioUrl: string) => {
    const response = await api.post<{ transcript: string }>(
      "/ai/transcribe-reference-audio",
      { audio_url: audioUrl },
      { timeout: 120_000 }
    );
    return response.data;
  },

  generateTaskTitle: async (description: string) => {
    const response = await api.post<{ title: string }>(
      "/ai/task-title-from-description",
      { description },
      { timeout: 60_000 },
    );
    return response.data;
  },
};
