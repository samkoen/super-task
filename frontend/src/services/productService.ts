import api from "./api";

export interface Product {
  id: string;
  department_id: string;
  name: string;
  sku: string;
  is_active: boolean;
  department_name?: string;
}

export const productService = {
  list: async (params?: { department_id?: string; name?: string }) => {
    const response = await api.get<Product[]>("/products", { params });
    return response.data;
  },
  create: async (payload: { department_id: string; name: string; sku?: string }) => {
    const response = await api.post<{ product: Product; message: string }>("/products", payload);
    return response.data;
  },
  update: async (id: string, data: Partial<Product>) => {
    const response = await api.patch<{ product: Product; message: string }>(
      `/products/${id}`,
      data
    );
    return response.data;
  },
};
