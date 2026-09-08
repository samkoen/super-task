import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { he } from "../i18n/he";
import { apiErrorMessage, humanizeApiError } from "../utils/apiErrorMessage";
import { resolveApiBaseUrl } from "./apiBaseUrl";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/** CapacitorHttp Android n'envoie pas correctement un POST sans body. */
export const EMPTY_JSON_BODY = {};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

const LOGOUT_PATHS = ["/auth/logout"];

export type UserRole = "admin" | "network_manager" | "branch_manager" | "employee";

export type JobFunction = "head_cashier" | "stockers" | "warehouse_worker" | "branch_manager";

export type EmployeeLanguage = "he" | "ar" | "th" | "fr" | "en";

export interface UserBranchMembership {
  branch_id: string;
  branch_name: string;
  is_primary: boolean;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  job_function: JobFunction | null;
  network_id: string | null;
  branch_id: string | null;
  network_name?: string | null;
  branch_name?: string | null;
  is_active: boolean;
  email_verified: boolean;
  preferred_language?: EmployeeLanguage;
  avatar_url?: string | null;
  excellence_slogan?: string | null;
  /** Memberships multi-snif (oved). */
  branches?: UserBranchMembership[];
  /** Rubrique דיווח תקלות מערכת (יצחק ריצרד). */
  can_view_system_bug_inbox?: boolean;
  /** Snif actif à l'écran (oved). */
  active_branch_id?: string | null;
  /** Mode test menahel : session réelle inchangée, UI oved. */
  is_preview?: boolean;
  preview_real_user?: {
    id: string;
    full_name: string;
    role: UserRole;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    if (error.response?.status === 401 && !window.location.pathname.includes("/login")) {
      const url = error.config?.url ?? "";
      if (!LOGOUT_PATHS.some((path) => url.includes(path))) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    const status = error.response?.status ?? 500;
    if (status === 413) {
      return Promise.reject(new ApiError(he.errorRequestTooLarge, 413));
    }
    const msg =
      humanizeApiError(error.response?.data) ||
      apiErrorMessage(error, error.response ? he.errorGeneric : he.errorServerUnreachable);
    return Promise.reject(new ApiError(msg, status));
  }
);

export default api;
