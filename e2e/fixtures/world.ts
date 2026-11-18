/** Données créées par backend/scripts/e2e_reset_db.py — garder les deux alignés. */
export const PASSWORD = "E2eTest123!";
export const MANAGER_EMAIL = "e2e.menahel@test.local";
export const EMPLOYEE_EMAIL = "e2e.oved@test.local";
export const SEEDED_TASK_TITLE = "משימת בדיקה e2e";

export const API_PORT = 5101;
export const WEB_PORT = 5273;

export const AUTH_FILE = {
  manager: ".tmp/auth/manager.json",
  employee: ".tmp/auth/employee.json",
} as const;
