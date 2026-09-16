import api from "./api";

export type AppReleaseLatest = {
  available: boolean;
  version_code?: number;
  version_name?: string;
  download_url?: string;
};

export type AppRelease = {
  id: string;
  version_code: number;
  version_name: string;
  created_at?: string;
};

export type ApkUploadIntent =
  | { mode: "proxy" }
  | {
      mode: "direct";
      putUrl: string;
      headers: Record<string, string>;
      url: string;
    };

export const appReleaseService = {
  async latest() {
    const response = await api.get<AppReleaseLatest>("/app-releases/latest");
    return response.data;
  },
  async list() {
    const response = await api.get<AppRelease[]>("/app-releases");
    return response.data;
  },
  async createIntent(size: number) {
    const response = await api.post<ApkUploadIntent>("/app-releases/intent", { size });
    return response.data;
  },
  async uploadProxy(file: File) {
    const form = new FormData();
    form.append("apk", file, file.name || "super-release.apk");
    const response = await api.post<{ url: string }>("/app-releases/upload", form, {
      timeout: 10 * 60 * 1000,
    });
    return response.data;
  },
  async publish(data: { version_name: string; apk_url: string }) {
    const response = await api.post<{ message: string; release: AppRelease }>(
      "/app-releases",
      data,
      { timeout: 60_000 },
    );
    return response.data;
  },
};
