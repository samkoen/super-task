import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API_PORT, WEB_PORT, AUTH_FILE } from "./fixtures/world";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const backendDir = path.join(root, "backend");
const python = path.join(
  backendDir,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
);

/**
 * Base e2e : E2E_DATABASE_URL, sinon le DATABASE_URL de backend/.env avec la base
 * renommée en super_e2e (même serveur Postgres local, base séparée).
 * Le script de reset refuse toute base non locale ou qui ne finit pas par _e2e.
 */
function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const envFile = path.join(backendDir, ".env");
  if (!existsSync(envFile)) {
    throw new Error("E2E_DATABASE_URL manquant et backend/.env introuvable.");
  }
  const line = readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL absent de backend/.env.");
  const url = new URL(line.slice("DATABASE_URL=".length).trim());
  url.pathname = "/super_e2e";
  return url.toString();
}

const apiEnv: Record<string, string> = {
  ...(process.env as Record<string, string>),
  DATABASE_URL: e2eDatabaseUrl(),
  ENVIRONMENT: "development",
  SECRET_KEY: "e2e-secret-key",
  COOKIE_SECURE: "false",
  UVICORN_PORT: String(API_PORT),
  UVICORN_HOST: "127.0.0.1",
  UVICORN_RELOAD: "0",
  LOG_LEVEL: "WARNING",
  PYTHONUTF8: "1",
  PYTHONIOENCODING: "utf-8",
  FRONTEND_URL: `http://localhost:${WEB_PORT}`,
  UPLOADS_DIR: path.join(here, ".tmp", "uploads"),
  // Aucun service externe pendant les tests (les valeurs vides gagnent sur backend/.env).
  BREVO_API_KEY: "",
  BREVO_USE_SIMULATION: "true",
  GEMINI_API_KEY: "",
  OPENCODE_API_KEY: "",
  GOOGLE_CLOUD_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
  GITHUB_TOKEN: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET: "",
  AWS_EC2_METADATA_DISABLED: "true",
};

const phone = {
  ...devices["Pixel 7"],
  locale: "he-IL",
  timezoneId: "Asia/Jerusalem",
};

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  outputDir: "./.tmp/test-results",
  // Une seule base partagée : les tests qui modifient des données ne tournent pas en parallèle.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: ".tmp/report" }]]
    : [["list"], ["html", { open: "never", outputFolder: ".tmp/report" }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: phone },
    {
      name: "anonymous",
      testMatch: /anonymous\/.*\.spec\.ts/,
      use: phone,
    },
    {
      name: "manager",
      testMatch: /manager\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...phone, storageState: AUTH_FILE.manager },
    },
    {
      name: "employee",
      testMatch: /employee\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...phone, storageState: AUTH_FILE.employee },
    },
    {
      // Parcours multi-rôles : chaque test ouvre ses propres contextes (menahel + oved).
      name: "flows",
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: phone,
    },
  ],
  webServer: [
    {
      // Base remise à zéro à chaque lancement, puis API sur un port dédié.
      command: `"${python}" scripts/e2e_reset_db.py && "${python}" run.py`,
      cwd: backendDir,
      env: apiEnv,
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: path.join(root, "frontend"),
      env: {
        ...(process.env as Record<string, string>),
        VITE_API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`,
        VITE_API_URL: "",
      },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
