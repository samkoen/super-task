import api from "./api";

export interface Network {
  id: string;
  name: string;
  is_active: boolean;
  manages_all_workers?: boolean;
}

export const networkService = {
  list: async (name?: string) => {
    const response = await api.get<Network[]>("/networks", { params: name ? { name } : undefined });
    return response.data;
  },
  create: async (name: string, managesAllWorkers = false) => {
    const response = await api.post<{ network: Network; message: string }>("/networks", {
      name,
      manages_all_workers: managesAllWorkers,
    });
    return response.data;
  },
  update: async (
    id: string,
    data: Partial<Pick<Network, "name" | "is_active" | "manages_all_workers">>,
  ) => {
    const response = await api.patch<{ network: Network; message: string }>(`/networks/${id}`, data);
    return response.data;
  },
};
