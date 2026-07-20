import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Charge les clés simples de frontend/.env dans process.env (sans écraser). */
function loadFrontendEnv(): void {
  const envPath = resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadFrontendEnv();

/**
 * URL chargée dans le WebView :
 * - Prod : https://super-nihul.vercel.app
 * - Dev local : http://<IP-PC>:5173
 * Sans ça, l'APK charge dist/ (nécessite VITE_API_URL).
 */
const serverUrl = process.env.CAPACITOR_DEV_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.supershift.app",
  appName: "SuperShift",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    cleartext: true,
    ...(serverUrl ? { url: serverUrl } : {}),
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
