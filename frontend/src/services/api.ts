import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const LOGOUT_PATHS = ["/auth/logout"];

export type UserRole = "admin" | "network_manager" | "branch_manager" | "employee";

export type JobFunction = "head_cashier" | "stockers" | "warehouse_worker";

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
      error.response?.data?.detail ??
      error.message ??
      "אירעה שגיאה";
    return Promise.reject(new ApiError(String(msg), error.response?.status ?? 500));
  }
);

export default api;
