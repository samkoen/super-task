import api, { type User, type UserRole } from "./api";

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
};
