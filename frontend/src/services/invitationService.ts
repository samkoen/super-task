import api, { type UserRole } from "./api";

export type JobFunction = "head_cashier" | "stockers" | "warehouse_worker";

export type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  job_function: JobFunction | null;
  network_id: string | null;
  branch_id: string | null;
  network_name?: string | null;
  branch_name?: string | null;
  invited_by_id: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationPreview {
  email: string;
  role: UserRole;
  job_function: JobFunction | null;
}

export interface CreateInvitationPayload {
  email: string;
  role: UserRole;
  job_function?: JobFunction;
  network_id?: string;
  branch_id?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  first_name: string;
  last_name: string;
  password: string;
}

export const invitationService = {
  list: async () => {
    const response = await api.get<Invitation[]>("/invitations");
    return response.data;
  },

  create: async (payload: CreateInvitationPayload) => {
    const response = await api.post<{ message: string; invitation: Invitation }>(
      "/invitations",
      payload
    );
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/invitations/${id}`);
    return response.data;
  },

  preview: async (token: string) => {
    const response = await api.get<InvitationPreview>(
      `/auth/invitation-preview?token=${encodeURIComponent(token)}`
    );
    return response.data;
  },

  accept: async (payload: AcceptInvitationPayload) => {
    const response = await api.post<{ message: string }>("/auth/accept-invitation", payload);
    return response.data;
  },
};
