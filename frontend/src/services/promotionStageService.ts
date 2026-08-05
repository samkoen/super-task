import api from "./api";

export type SignageStatus = "ok" | "needs_update";

export interface PromotionStage {
  id: string;
  branch_id: string;
  department_id: string;
  department_name?: string | null;
  name: string;
  location_label: string;
  assignee_user_id: string | null;
  assignee_name?: string | null;
  lead_product_name: string;
  stock_pct: number;
  signage_status: SignageStatus | string;
  open_tasks?: number;
  needs_refill?: boolean;
  urgent?: boolean;
  refill_suggested?: boolean;
  is_active: boolean;
}

export const promotionStageService = {
  async list(branchId: string): Promise<PromotionStage[]> {
    const response = await api.get<PromotionStage[]>("/promotion-stages", {
      params: { branch_id: branchId },
    });
    return response.data;
  },

  async analysis(branchId: string): Promise<PromotionStage[]> {
    const response = await api.get<PromotionStage[]>("/promotion-stages/analysis", {
      params: { branch_id: branchId },
    });
    return response.data;
  },

  async create(data: {
    branch_id: string;
    department_id: string;
    name: string;
    location_label?: string;
    assignee_user_id?: string | null;
    lead_product_name?: string;
    stock_pct?: number;
    signage_status?: string;
  }): Promise<{ message: string; stage: PromotionStage }> {
    const response = await api.post("/promotion-stages", data);
    return response.data;
  },

  async updateStock(
    stageId: string,
    data: { stock_pct: number; signage_status?: string },
  ): Promise<{ message: string; stage: PromotionStage }> {
    const response = await api.patch(`/promotion-stages/${stageId}/stock`, data);
    return response.data;
  },
};
