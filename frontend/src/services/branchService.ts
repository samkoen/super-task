import api from "./api";

export interface Branch {
  id: string;
  network_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  is_active: boolean;
  network_name?: string;
}

export const branchService = {
  list: async (params?: { network_id?: string; name?: string }) => {
    const response = await api.get<Branch[]>("/branches", { params });
    return response.data;
  },
  create: async (payload: Omit<Branch, "id" | "is_active" | "network_name">) => {
    const response = await api.post<{ branch: Branch; message: string }>("/branches", payload);
    return response.data;
  },
  update: async (id: string, data: Partial<Branch>) => {
    const response = await api.patch<{ branch: Branch; message: string }>(`/branches/${id}`, data);
    return response.data;
  },
};
