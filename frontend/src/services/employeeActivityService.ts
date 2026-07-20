import api from "./api";

export interface BreakState {
  on_break: boolean;
  on_break_since: string | null;
  message?: string;
}

export const employeeActivityService = {
  getBreak: async () => {
    const response = await api.get<BreakState>("/employee-activity/break");
    return response.data;
  },

  startBreak: async () => {
    const response = await api.post<BreakState & { message: string }>(
      "/employee-activity/break/start",
    );
    return response.data;
  },

  endBreak: async () => {
    const response = await api.post<BreakState & { message: string }>(
      "/employee-activity/break/end",
    );
    return response.data;
  },
};
