import api from "./api";

export interface Department {
  id: string;
  branch_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  branch_name?: string;
}

export const departmentService = {
  list: async (params?: { branch_id?: string; name?: string }) => {
    const response = await api.get<Department[]>("/departments", { params });
    return response.data;
  },
  create: async (payload: { branch_id: string; name: string; sort_order?: number }) => {
    const response = await api.post<{ department: Department; message: string }>(
      "/departments",
      payload
    );
    return response.data;
  },
  update: async (id: string, data: Partial<Department>) => {
    const response = await api.patch<{ department: Department; message: string }>(
      `/departments/${id}`,
      data
    );
    return response.data;
  },
};
