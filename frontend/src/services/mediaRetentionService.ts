import api from "./api";

export interface MediaRetentionSetting {
  retention_days: number;
  message?: string;
}

export const mediaRetentionService = {
  get: async () => {
    const response = await api.get<MediaRetentionSetting>("/settings/media-retention");
    return response.data;
  },
  update: async (retentionDays: number) => {
    const response = await api.put<MediaRetentionSetting>("/settings/media-retention", {
      retention_days: retentionDays,
    });
    return response.data;
  },
};
