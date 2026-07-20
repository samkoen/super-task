import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { he } from "../i18n/he";
import { resolveApiBaseUrl } from "./apiBaseUrl";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

const LOGOUT_PATHS = ["/auth/logout"];

export type UserRole = "admin" | "network_manager" | "branch_manager" | "employee";

export type JobFunction = "head_cashier" | "stockers" | "warehouse_worker";

export type EmployeeLanguage = "he" | "ar" | "th" | "fr" | "en";

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
    const msg =
      error.response?.data?.error ??
      formatApiDetail(error.response?.data?.detail) ??
      (error.response
        ? error.message ?? "אירעה שגיאה"
        : he.errorServerUnreachable);
    return Promise.reject(new ApiError(String(msg), error.response?.status ?? 500));
  }
);

function formatApiDetail(detail: unknown): string | undefined {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!Array.isArray(detail)) return undefined;
  const parts = detail
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as { msg?: string; loc?: unknown[] };
      const field = Array.isArray(row.loc) ? row.loc.filter((x) => x !== "body").join(".") : "";
      const message = row.msg || "";
      return field ? `${field}: ${message}` : message;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" | ") : undefined;
}

export default api;
