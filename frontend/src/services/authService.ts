import api, { type EmployeeLanguage, type User } from "./api";

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post<{ user: User; message: string }>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.get<{ ok: boolean; already_verified: boolean }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    return response.data;
  },

  logout: async () => {
    try {
      await api.post<{ message: string }>("/auth/logout");
      return;
    } catch {
      await api.get<{ message: string }>("/auth/logout");
    }
  },

  getCurrentUser: async () => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },

  setActiveBranch: async (branchId: string) => {
    const response = await api.post<{ user: User }>("/auth/active-branch", {
      branch_id: branchId,
    });
    return response.data;
  },

  viewAs: async (userId: string) => {
    const response = await api.post<{ user: User }>("/auth/view-as", {
      user_id: userId,
    });
    return response.data;
  },

  exitViewAs: async () => {
    const response = await api.post<{ user: User }>("/auth/exit-view-as");
    return response.data;
  },

  updateProfile: async (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    preferred_language?: EmployeeLanguage;
  }) => {
    const response = await api.patch<{ user: User; message: string }>("/auth/me", payload);
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ user: User; message: string; url: string }>(
      "/auth/me/avatar",
      form,
    );
    return response.data;
  },

  stylizeAvatar: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{
      user: User;
      message: string;
      url: string;
      used_ai: boolean;
    }>("/auth/me/avatar/excellence", form, { timeout: 120_000 });
    return response.data;
  },

  changePassword: async (current_password: string, new_password: string) => {
    const response = await api.post<{ message: string }>("/auth/change-password", {
      current_password,
      new_password,
    });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await api.post<{ message: string }>("/auth/resend-verification", {
      email,
    });
    return response.data;
  },
};
