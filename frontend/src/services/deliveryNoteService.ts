import api from "./api";
import type { DeliveryCheck, DeliveryOverall } from "../utils/deliveryNote";

export type DeliveryAnswerPayload = {
  overall_status?: DeliveryOverall | null;
  lines: Array<Record<string, unknown>>;
};

export const deliveryNoteService = {
  markTemplate: async (templateId: string, opened: boolean, taskType: string | null = null) => {
    const response = await api.post<{
      id: string;
      opened_by_delivery_note: boolean;
      delivery_note_task_type: string | null;
    }>(`/delivery-notes/templates/${templateId}`, { opened, task_type: taskType });
    return response.data;
  },

  account: async () => {
    const response = await api.get<{
      enabled: boolean;
      configured: boolean;
      username: string;
      internal: boolean;
    }>("/delivery-notes/account");
    return response.data;
  },

  saveAccount: async (payload: {
    enabled: boolean;
    username: string;
    password: string;
    internal: boolean;
  }) => {
    const response = await api.post<{
      enabled: boolean;
      configured: boolean;
      username: string;
      internal: boolean;
    }>("/delivery-notes/account", payload);
    return response.data;
  },

  inbox: async () => {
    const response = await api.get<
      Array<{
        agroline_number: string;
        customer_name: string;
        document_date: string;
        kind: string;
        pdf_url?: string | null;
        lines: Array<{ product_name: string; quantity: number; unit: string; origin_name?: string | null }>;
      }>
    >("/delivery-notes/inbox");
    return response.data;
  },

  syncToday: async () => {
    const response = await api.post<{
      results: Array<{ opened_occurrence_ids: string[] }>;
      errors: Array<{ agroline_number: string; error: string }>;
    }>("/delivery-notes/sync", {}, { timeout: 300_000 });
    return response.data;
  },

  linkCustomer: async (customerName: string, branchId: string) => {
    const response = await api.post<{
      customer_name: string;
      branch_id: string;
      opened_occurrence_ids: string[];
    }>(
      "/delivery-notes/links",
      { customer_name: customerName, branch_id: branchId },
    );
    return response.data;
  },

  checkForOccurrence: async (occurrenceId: string) => {
    const response = await api.get<DeliveryCheck>(`/delivery-notes/occurrences/${occurrenceId}`);
    return response.data;
  },

  submitAnswers: async (occurrenceId: string, payload: DeliveryAnswerPayload) => {
    const response = await api.post<{ suggested_overall: string; overall_status: string }>(
      `/delivery-notes/occurrences/${occurrenceId}/answers`,
      payload,
    );
    return response.data;
  },
};
