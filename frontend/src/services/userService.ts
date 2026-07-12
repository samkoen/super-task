import api, { type EmployeeLanguage, type User, type UserRole } from "./api";

export interface CreateUserPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  network_id?: string;
  branch_id?: string;
  skip_verification_email?: boolean;
}

export interface TeamEmployeePayload {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_function?: string;
  branch_id?: string;
  preferred_language?: EmployeeLanguage;
}

export const userService = {
  list: async (role?: UserRole) => {
    const params = role ? { role } : undefined;
    const response = await api.get<User[]>("/users", { params });
    return response.data;
  },

  listTeam: async (role?: UserRole) => {
    const params = role ? { role } : undefined;
    const response = await api.get<User[]>("/users/team", { params });
    return response.data;
  },

  create: async (payload: CreateUserPayload) => {
    const response = await api.post<{ user: User; message: string }>("/users", payload);
    return response.data;
  },

  createTeamEmployee: async (payload: TeamEmployeePayload) => {
    const response = await api.post<{ user: User; message: string }>("/users/team", payload);
    return response.data;
  },

  updateTeamEmployee: async (id: string, payload: TeamEmployeePayload) => {
    const response = await api.patch<{ user: User; message: string }>(`/users/team/${id}`, payload);
    return response.data;
  },

  deactivateTeamEmployee: async (id: string) => {
    const response = await api.delete<{ user: User; message: string }>(`/users/team/${id}`);
    return response.data;
  },

  setTeamEmployeeAccess: async (id: string, is_active: boolean) => {
    const response = await api.patch<{ user: User; message: string }>(
      `/users/team/${id}/access`,
      { is_active }
    );
    return response.data;
  },

  resetTeamEmployeePassword: async (id: string, password: string) => {
    const response = await api.post<{ user: User; message: string }>(
      `/users/team/${id}/reset-password`,
      { password }
    );
    return response.data;
  },
};
