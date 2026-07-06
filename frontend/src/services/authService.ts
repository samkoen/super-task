import api, { type User } from "./api";

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

  resendVerification: async (email: string) => {
    const response = await api.post<{ message: string }>("/auth/resend-verification", {
      email,
    });
    return response.data;
  },
};
